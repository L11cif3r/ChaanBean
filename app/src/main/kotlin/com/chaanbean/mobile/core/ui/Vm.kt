package com.chaanbean.mobile.core.ui

import androidx.compose.runtime.Composable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.di.LocalAppContainer

/**
 * Builds a ViewModel from the AppContainer without a DI framework.
 *
 *     val vm = rememberVm { VendorsViewModel(VendorsModule.repository(it)) }
 */
@Composable
inline fun <reified VM : ViewModel> rememberVm(
    crossinline factory: (AppContainer) -> VM,
): VM {
    val container = LocalAppContainer.current
    return viewModel(
        modelClass = VM::class.java,
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = factory(container) as T
        },
    )
}
