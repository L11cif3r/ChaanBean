package com.chaanbean.mobile.core.model

/** Every repository call returns this; screens render the three states directly. */
sealed interface Outcome<out T> {
    data object Loading : Outcome<Nothing>
    data class Ok<T>(val value: T) : Outcome<T>
    data class Err(val message: String, val cause: Throwable? = null) : Outcome<Nothing>
}

suspend fun <T> outcomeOf(block: suspend () -> T): Outcome<T> = try {
    Outcome.Ok(block())
} catch (t: Throwable) {
    Outcome.Err(t.message ?: t::class.simpleName ?: "Request failed", t)
}
