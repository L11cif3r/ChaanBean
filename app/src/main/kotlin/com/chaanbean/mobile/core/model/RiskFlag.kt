package com.chaanbean.mobile.core.model

/**
 * main's headline deliverable: the deterministic Green/Amber/Red flag.
 * Server sends these uppercase in `RiskFlag.flag` and `BizRiskFlag.flag`.
 */
enum class RiskFlag {
    GREEN, AMBER, RED, UNKNOWN;

    companion object {
        fun from(raw: String?): RiskFlag = when (raw?.trim()?.uppercase()) {
            "GREEN" -> GREEN
            "AMBER" -> AMBER
            "RED" -> RED
            else -> UNKNOWN
        }
    }
}
