package com.chaanbean.mobile.feature.businesscheck.ui

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.businesscheck.data.BusinessCheckModule
import com.chaanbean.mobile.feature.businesscheck.data.DocumentUpload
import com.chaanbean.mobile.feature.businesscheck.data.FinancialDocument
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Categories the upload handler accepts, in the order the web form lists them. */
private val CATEGORIES = listOf(
    "PNL" to "Profit & loss statement",
    "BALANCE_SHEET" to "Balance sheet",
    "BANK_STATEMENT" to "Bank statement",
    "GST_RETURN" to "GST return (GSTR-3B)",
    "IT_RETURN" to "Income tax return",
    "UDYAM_CERT" to "Udyam certificate",
    "MCA_EXTRACT" to "MCA extract",
    "OTHER" to "Other",
)

private val FISCAL_YEARS = listOf("FY2024-25", "FY2023-24", "FY2022-23", "FY2021-22", "FY2020-21")

private const val MAX_UPLOAD_BYTES = 20L * 1024L * 1024L

private data class PickedFile(
    val uri: Uri,
    val name: String,
    val mimeType: String,
    val sizeBytes: Long,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessDocumentsScreen(businessId: String, onBack: () -> Unit) {
    val vm = rememberVm {
        BusinessDocumentsViewModel(BusinessCheckModule.repository(it), businessId)
    }
    val state by vm.state.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

    var category by remember { mutableStateOf(CATEGORIES.first().first) }
    var fiscalYear by remember { mutableStateOf(FISCAL_YEARS.first()) }
    var picked by remember { mutableStateOf<PickedFile?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        picked = if (uri == null) null else describe(context, uri)
    }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text("Financial documents") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                SectionHeader(
                    "Upload a document",
                    "PDF, XLSX and CSV are parsed on the server. Images are stored but " +
                        "need the figures typed in by hand.",
                )
            }

            item {
                UploadCard(
                    category = category,
                    fiscalYear = fiscalYear,
                    picked = picked,
                    uploading = state.uploading,
                    onCategoryChange = { category = it },
                    onFiscalYearChange = { fiscalYear = it },
                    onPick = { picker.launch("*/*") },
                    onClear = { picked = null },
                    onUpload = {
                        val file = picked
                        if (file != null) {
                            scope.launch {
                                val upload = readUpload(context, file, category, fiscalYear)
                                if (upload == null) {
                                    vm.reportError("That file could not be read from storage.")
                                } else {
                                    picked = null
                                    vm.upload(upload)
                                }
                            }
                        }
                    },
                )
            }

            item { SectionHeader("On file", "Processing status is what the server reported.") }

            when (val outcome = state.documents) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val documents = outcome.value
                    if (documents.isEmpty()) {
                        item { EmptyBox("No documents uploaded for this business yet.") }
                    } else {
                        items(documents, key = { it.id }) { DocumentCard(it) }
                    }
                }
            }
            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

@Composable
private fun UploadCard(
    category: String,
    fiscalYear: String,
    picked: PickedFile?,
    uploading: Boolean,
    onCategoryChange: (String) -> Unit,
    onFiscalYearChange: (String) -> Unit,
    onPick: () -> Unit,
    onClear: () -> Unit,
    onUpload: () -> Unit,
) {
    val tooLarge = picked != null && picked.sizeBytes > MAX_UPLOAD_BYTES
    ChaanCard {
        PickerDropdown(
            label = "Category",
            selectedLabel = CATEGORIES.firstOrNull { it.first == category }?.second ?: category,
            options = CATEGORIES,
            onSelect = onCategoryChange,
        )
        Spacer(Modifier.height(10.dp))
        PickerDropdown(
            label = "Fiscal year",
            selectedLabel = fiscalYear,
            options = FISCAL_YEARS.map { it to it },
            onSelect = onFiscalYearChange,
        )
        Spacer(Modifier.height(14.dp))

        if (picked == null) {
            Text(
                "No file chosen.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(picked.name, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(2.dp))
            Text(
                "${picked.mimeType} - ${formatBytes(picked.sizeBytes.toInt())}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (tooLarge) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "The server rejects anything over 20 MB.",
                    style = MaterialTheme.typography.labelSmall,
                    color = Chaan.Red,
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onPick, enabled = !uploading) {
                Text(if (picked == null) "Choose file" else "Choose another")
            }
            if (picked != null) {
                TextButton(onClick = onClear, enabled = !uploading) { Text("Clear") }
            }
        }
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = onUpload,
            enabled = picked != null && !uploading && !tooLarge,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (uploading) "Uploading..." else "Upload and process")
        }
    }
}

@Composable
private fun PickerDropdown(
    label: String,
    selectedLabel: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth()) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        Box {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                Text(selectedLabel)
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (value, text) ->
                    DropdownMenuItem(
                        text = { Text(text) },
                        onClick = {
                            onSelect(value)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun DocumentCard(document: FinancialDocument) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(document.originalName, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text(
                    humanizeStatus(document.category),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(
                text = humanizeStatus(document.processingStatus),
                tint = processingTint(document.processingStatus),
            )
        }
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Fiscal year", document.fiscalYear ?: EM_DASH)
        KeyValueRow("Size", formatBytes(document.fileSizeBytes))
        KeyValueRow("Uploaded", formatDateTime(document.uploadedAt))
        if (document.extractions.isNotEmpty()) {
            KeyValueRow("Extractions", document.extractions.size.toString())
        }
        document.processingError?.let {
            Spacer(Modifier.height(6.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = Chaan.Red)
        }
    }
}

/** Name, type and size straight from the content provider that owns the Uri. */
private fun describe(context: Context, uri: Uri): PickedFile {
    var name = "document"
    var size = 0L
    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (cursor.moveToFirst()) {
            if (nameIndex >= 0 && !cursor.isNull(nameIndex)) name = cursor.getString(nameIndex)
            if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex)
        }
    }
    return PickedFile(
        uri = uri,
        name = name,
        mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream",
        sizeBytes = size,
    )
}

/** The multipart body needs the bytes, so they are read off the main thread. */
private suspend fun readUpload(
    context: Context,
    file: PickedFile,
    category: String,
    fiscalYear: String?,
): DocumentUpload? = withContext(Dispatchers.IO) {
    val bytes = try {
        context.contentResolver.openInputStream(file.uri)?.use { it.readBytes() }
    } catch (t: Throwable) {
        null
    }
    if (bytes == null) {
        null
    } else {
        DocumentUpload(
            fileName = file.name,
            mimeType = file.mimeType,
            bytes = bytes,
            category = category,
            fiscalYear = fiscalYear,
        )
    }
}
