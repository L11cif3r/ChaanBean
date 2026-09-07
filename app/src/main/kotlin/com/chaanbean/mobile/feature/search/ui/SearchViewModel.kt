package com.chaanbean.mobile.feature.search.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.search.data.BusinessSummary
import com.chaanbean.mobile.feature.search.data.MIN_QUERY_LENGTH
import com.chaanbean.mobile.feature.search.data.SearchHit
import com.chaanbean.mobile.feature.search.data.SearchRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    /** The query the currently displayed results were fetched for. */
    val resolvedQuery: String = "",
    val flagFilter: String? = null,
    val hits: Outcome<List<SearchHit>> = Outcome.Ok(emptyList()),
    val businesses: Outcome<List<BusinessSummary>> = Outcome.Ok(emptyList()),
    /** A request is in flight; previous results stay on screen underneath it. */
    val searching: Boolean = false,
    /** False until at least one search has completed, so "no results" is not shown too early. */
    val hasSearched: Boolean = false,
    val recent: List<String> = emptyList(),
) {
    val queryTooShort: Boolean get() = query.trim().length < MIN_QUERY_LENGTH
}

/**
 * Debounces at 250ms - the web client uses 220ms and the same 2-character floor,
 * so the two front ends put the same load on the same unindexed LIKE queries.
 */
class SearchViewModel(private val repository: SearchRepository) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private var inFlight: Job? = null

    fun onQueryChange(raw: String) {
        _state.value = _state.value.copy(query = raw)
        schedule(DEBOUNCE_MS)
    }

    /** IME "Search" action: skip the debounce and keep the term in the recent list. */
    fun submit() {
        val q = _state.value.query.trim()
        if (q.length >= MIN_QUERY_LENGTH) {
            val recent = (listOf(q) + _state.value.recent.filterNot { it.equals(q, ignoreCase = true) })
                .take(RECENT_LIMIT)
            _state.value = _state.value.copy(recent = recent)
        }
        schedule(0L)
    }

    fun onRecentSelected(term: String) {
        _state.value = _state.value.copy(query = term)
        schedule(0L)
    }

    /** Only narrows the business-verification group; /api/search takes no flag. */
    fun onFlagFilterChange(flag: String?) {
        _state.value = _state.value.copy(flagFilter = flag)
        schedule(0L)
    }

    fun clearQuery() {
        inFlight?.cancel()
        _state.value = SearchUiState(recent = _state.value.recent, flagFilter = _state.value.flagFilter)
    }

    fun retry() = schedule(0L)

    private fun schedule(delayMs: Long) {
        inFlight?.cancel()
        val q = _state.value.query.trim()
        if (q.length < MIN_QUERY_LENGTH) {
            _state.value = _state.value.copy(
                hits = Outcome.Ok(emptyList()),
                businesses = Outcome.Ok(emptyList()),
                searching = false,
                hasSearched = false,
                resolvedQuery = "",
            )
            return
        }
        inFlight = viewModelScope.launch {
            delay(delayMs)
            _state.value = _state.value.copy(searching = true)
            val flag = _state.value.flagFilter
            // Two independent endpoints, so fire them together rather than in series.
            val hits = async { repository.search(q) }
            val businesses = async { repository.searchBusinesses(q, flag) }
            _state.value = _state.value.copy(
                hits = hits.await(),
                businesses = businesses.await(),
                searching = false,
                hasSearched = true,
                resolvedQuery = q,
            )
        }
    }

    private companion object {
        const val DEBOUNCE_MS = 250L
        const val RECENT_LIMIT = 6
    }
}
