"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "email" | "number" | "checkbox" | "select";
  required?: boolean;
  hint?: string;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
  /** Only shown when adding a new item (e.g. which department a procedure belongs to). */
  newOnly?: boolean;
};

export type Item = { id: string; _group?: string; _locked?: boolean } & Record<string, unknown>;

type Props = {
  table: string;
  items: Item[];
  fields: Field[];
  titleField: string;
  itemLabel: string;
  newDefaults?: Record<string, unknown>;
  canAdd?: boolean;
  canDelete?: boolean;
  /** New rows get sort_order = current max + 1 (handbook sections have a unique sort_order). */
  autoSortOrder?: boolean;
  /** New rows get a URL slug generated from this field. */
  slugFrom?: string;
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";
}

function readValues(form: HTMLFormElement, fields: Field[], isNew: boolean) {
  const data = new FormData(form);
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.newOnly && !isNew) continue;
    if (field.type === "checkbox") {
      values[field.name] = data.get(field.name) === "on";
      continue;
    }
    const raw = String(data.get(field.name) ?? "").trim();
    if (field.type === "number") values[field.name] = raw === "" ? 0 : Number(raw);
    else values[field.name] = raw === "" && !field.required ? null : raw;
  }
  return values;
}

function FieldInput({ field, value }: { field: Field; value: unknown }) {
  const common = { name: field.name, required: field.required };
  if (field.type === "checkbox") {
    return (
      <label className="content-check"><input type="checkbox" name={field.name} defaultChecked={Boolean(value)} /> {field.label}</label>
    );
  }
  let input: React.ReactNode;
  if (field.type === "textarea") input = <textarea {...common} rows={field.rows ?? 5} defaultValue={(value as string) ?? ""} />;
  else if (field.type === "select") {
    input = (
      <select {...common} defaultValue={(value as string) ?? field.options?.[0]?.value}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  } else input = <input {...common} type={field.type} min={field.type === "number" ? 0 : undefined} defaultValue={(value as string | number) ?? ""} />;
  return (
    <label className="field"><span>{field.label}{!field.required && <small> (optional)</small>}</span>
      {input}
      {field.hint && <small className="content-hint">{field.hint}</small>}
    </label>
  );
}

function ItemForm({ fields, item, isNew, busy, onSave, onCancel, onDelete }: {
  fields: Field[]; item?: Item; isNew: boolean; busy: boolean;
  onSave: (form: HTMLFormElement) => void; onCancel?: () => void; onDelete?: () => void;
}) {
  return (
    <form className="content-form" onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}>
      {fields.filter((field) => isNew || !field.newOnly).map((field) => <FieldInput key={field.name} field={field} value={item?.[field.name]} />)}
      <div className="content-actions">
        <button className="button small" disabled={busy}>{busy ? "Saving…" : isNew ? "Add" : "Save changes"}</button>
        {onCancel && <button type="button" className="text-link" onClick={onCancel}>Cancel</button>}
        {onDelete && <button type="button" className="content-delete" onClick={onDelete} disabled={busy}><Trash2 size={14} /> Delete</button>}
      </div>
    </form>
  );
}

export function ContentEditor({ table, items, fields, titleField, itemLabel, newDefaults = {}, canAdd = true, canDelete = true, autoSortOrder, slugFrom }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function run(id: string, action: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setBusyId(id);
    setMessage(null);
    const { error } = await action();
    setBusyId(null);
    if (error) {
      setMessage({ kind: "error", text: `Couldn't save: ${error.message}` });
      return false;
    }
    setMessage({ kind: "ok", text: success });
    router.refresh();
    return true;
  }

  function save(item: Item, form: HTMLFormElement) {
    const values = readValues(form, fields, false);
    return run(item.id, () => createClient().from(table).update(values).eq("id", item.id), "Saved. The change is live on the site.");
  }

  async function add(form: HTMLFormElement) {
    const values: Record<string, unknown> = { ...newDefaults, ...readValues(form, fields, true) };
    if (autoSortOrder) values.sort_order = Math.max(0, ...items.map((item) => Number(item.sort_order) || 0)) + 1;
    if (slugFrom) values.slug = `${slugify(String(values[slugFrom] ?? ""))}-${Math.random().toString(36).slice(2, 6)}`;
    const ok = await run("new", () => createClient().from(table).insert(values), `${itemLabel} added.`);
    if (ok) setAdding(false);
  }

  function remove(item: Item) {
    if (!window.confirm(`Delete "${String(item[titleField] ?? itemLabel)}"? This can't be undone.`)) return;
    run(item.id, () => createClient().from(table).delete().eq("id", item.id), `${itemLabel} deleted.`);
  }

  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = item._group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="content-editor">
      {message && <div className={message.kind === "ok" ? "form-success" : "form-error"} role="status">{message.text}</div>}

      {canAdd && (adding ? (
        <div className="content-item open new">
          <strong className="content-new-title">New {itemLabel.toLowerCase()}</strong>
          <ItemForm fields={fields} isNew busy={busyId === "new"} onSave={add} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" className="button small content-add" onClick={() => setAdding(true)}><Plus size={15} /> Add {itemLabel.toLowerCase()}</button>
      ))}

      {!items.length && <div className="queue-empty">Nothing here yet.</div>}

      {[...groups.entries()].map(([group, groupItems]) => (
        <section key={group || "all"}>
          {group && <h3 className="content-group">{group}</h3>}
          {groupItems.map((item) => (
            <details className="content-item" key={item.id}>
              <summary>
                <span>{String(item[titleField] || `Untitled ${itemLabel.toLowerCase()}`)}</span>
                {item._locked && <small className="content-locked"><Lock size={12} /> Shared by all locations</small>}
                {item.status === "draft" && <small className="content-draft">Hidden (draft)</small>}
              </summary>
              {item._locked ? (
                <p className="content-hint">This is shared by every location, so only a platform admin can change it.</p>
              ) : (
                <ItemForm
                  fields={fields}
                  item={item}
                  isNew={false}
                  busy={busyId === item.id}
                  onSave={(form) => save(item, form)}
                  onDelete={canDelete ? () => remove(item) : undefined}
                />
              )}
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
