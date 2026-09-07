package com.chaanbean.mobile.feature.businesscheck.data

import kotlinx.serialization.Serializable

/**
 * `GET /api/businesses/{id}/documents/{docId}`.
 *
 * The handler ignores the business id entirely and looks the document up by docId
 * alone, so a document from any business is reachable through any business's path.
 */
@Serializable
data class SingleDocumentResponse(
    val document: FinancialDocument? = null,
    val error: String? = null,
)
