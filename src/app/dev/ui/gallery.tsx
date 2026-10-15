"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  ErrorSummary,
  FormField,
  Input,
  PageHeader,
  Pill,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  Tag,
  Textarea,
  Toggle,
} from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatInr, formatInrShort } from "@/lib/money";
import { maskMobile } from "@/lib/mask";

interface Row {
  id: string;
  name: string;
  gstin: string;
  mobile: string;
  band: "Low" | "Moderate" | "High";
  outstanding: bigint;
}

// Sample data for the gallery only.
const ROWS: Row[] = [
  { id: "1", name: "Om Builders", gstin: "29AAACO1234F1Z5", mobile: "9876543210", band: "Low", outstanding: 1_84_00_000_00n },
  { id: "2", name: "Kumar Hardware", gstin: "29AAPFK5678L1Z2", mobile: "9123456780", band: "Moderate", outstanding: 12_60_000_00n },
  { id: "3", name: "Patel Agencies", gstin: "24AABCP9012Q1Z8", mobile: "8899001122", band: "High", outstanding: 4_00_000_00n },
];

const bandTone = { Low: "success", Moderate: "warning", High: "danger" } as const;

const columns: Column<Row>[] = [
  { key: "name", header: "Name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
  { key: "gstin", header: "GSTIN", label: "GSTIN", render: (r) => <span className="font-mono text-xs">{r.gstin}</span>, hideOnMobile: true },
  { key: "mobile", header: "Mobile", label: "Mobile", render: (r) => maskMobile(r.mobile), hideOnMobile: true },
  { key: "band", header: "Risk band", label: "Risk band", render: (r) => <Tag tone={bandTone[r.band]}>{r.band}</Tag>, sortValue: (r) => r.band },
  {
    key: "outstanding",
    header: "Outstanding",
    label: "Outstanding",
    align: "right",
    render: (r) => formatInr(r.outstanding),
    sortValue: (r) => Number(r.outstanding),
  },
];

export function Gallery() {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Design system"
        description="Tokens and components for every Phase 1 screen. Colours follow the PRD wireframes until brand assets arrive."
        actions={<Pill>Development only</Pill>}
      />

      <Card>
        <CardHeader title="Buttons and tags" />
        <CardBody className="flex flex-wrap items-center gap-3">
          <Button>Run Credit Check</Button>
          <Button variant="secondary">Case Check</Button>
          <Button variant="ghost">View all</Button>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Cancel transaction
          </Button>
          <Button loading>Saving</Button>
          <Tag tone="success">Accepted</Tag>
          <Tag tone="warning">Waiting 31 h</Tag>
          <Tag tone="danger">Overdue 12 days</Tag>
          <Tag tone="info">Viewed</Tag>
          <Tag>Draft</Tag>
          <Button variant="secondary" size="sm" onClick={() => toast("Saved", "success")}>
            Show toast
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Counterparties" value="48" hint="6 added this month" />
        <StatCard label="Checks this month" value="37" hint="Pending consent: 2" />
        <StatCard label="Active secured value" value={formatInrShort(1_84_00_000_00n)} hint="22 transactions" />
        <StatCard label="Overdue" value={formatInrShort(12_60_000_00n)} hint="4 transactions" />
      </div>

      <Card>
        <CardHeader title="Table (sort and paginate)" />
        <DataTable columns={columns} rows={ROWS} rowKey={(r) => r.id} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Form" />
          <CardBody className="space-y-4">
            {showErrors ? (
              <ErrorSummary
                title="Please fix the following:"
                errors={[
                  { field: "g-gstin", message: "This GSTIN is not valid. Check and try again." },
                  { field: "g-mobile", message: "Enter a valid 10-digit Indian mobile number." },
                ]}
              />
            ) : null}
            <FormField id="g-gstin" label="GSTIN" required error={showErrors ? "This GSTIN is not valid. Check and try again." : undefined}>
              <Input id="g-gstin" placeholder="29AAACO1234F1Z5" error={showErrors ? "x" : undefined} autoCapitalize="characters" />
            </FormField>
            <FormField id="g-mobile" label="Mobile number" hint="Indian mobile, +91" required error={showErrors ? "Enter a valid 10-digit Indian mobile number." : undefined}>
              <Input id="g-mobile" inputMode="numeric" placeholder="98765 43210" hint="h" error={showErrors ? "x" : undefined} />
            </FormField>
            <FormField id="g-designation" label="Designation" required>
              <Select id="g-designation" defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>Proprietor</option>
                <option>Director</option>
              </Select>
            </FormField>
            <FormField id="g-notes" label="Notes">
              <Textarea id="g-notes" />
            </FormField>
            <Checkbox id="g-terms" label="I accept the Terms of Use and Privacy Notice" />
            <div className="flex flex-wrap gap-4">
              <Toggle id="g-sms" label="SMS" defaultChecked />
              <Toggle id="g-email" label="Email" />
              <Toggle id="g-wa" label="WhatsApp" defaultChecked />
            </div>
            <Button onClick={() => setShowErrors((v) => !v)}>{showErrors ? "Clear errors" : "Submit with errors"}</Button>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Plan usage" />
            <CardBody className="space-y-3">
              <ProgressBar label="Bureau reports" value={9} max={30} />
              <ProgressBar label="Filed GST turnover" value={14} max={42} />
              <ProgressBar label="Users" value={4} max={5} />
              <ProgressBar label="Court case history" value={20} max={21} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tabs" />
            <CardBody>
              <Tabs
                items={[
                  { key: "overview", label: "Overview", content: <p className="text-sm text-muted">Overview content</p> },
                  { key: "reports", label: "Reports", count: 3, content: <p className="text-sm text-muted">Reports content</p> },
                  { key: "cases", label: "Cases", count: 1, content: <p className="text-sm text-muted">Cases content</p> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Loading and empty" />
            <CardBody className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardBody>
            <EmptyState title="No counterparties yet" body="Add your first buyer, debtor or borrower to run checks." action={<Button>Add counterparty</Button>} />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          toast("Transaction cancelled", "danger");
        }}
        title="Cancel this transaction?"
        body="The counterparty will be told the link is withdrawn. This cannot be undone."
        confirmLabel="Cancel transaction"
        destructive
      />
    </div>
  );
}
