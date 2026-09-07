package com.chaanbean.mobile

import android.app.Application
import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.di.createAppContainer

class ChaanBeanApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = createAppContainer(this)
    }
}
