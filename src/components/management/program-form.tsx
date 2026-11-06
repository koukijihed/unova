"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
} from "@/components/management/form-fields";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormBoolean,
  readFormString,
} from "@/lib/management/action-state";
import type {
  DegreeType,
  Department,
  ProgramListItem,
} from "@/lib/management/admin-data";
import {
  createProgram,
  updateProgram,
} from "@/lib/management/program-actions";

type ProgramFormProps = {
  mode: "create" | "edit";
  degreeTypes: DegreeType[];
  departments: Department[];
  program?: ProgramListItem;
};

export function ProgramForm({
  mode,
  degreeTypes,
  departments,
  program,
}: ProgramFormProps) {
  const [state, formAction] = useActionState(
    mode === "create" ? createProgram : updateProgram,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.admin.programs;
  const common = fr.app.management.admin.common;
  const fieldErrors = state.fieldErrors ?? {};
  useFormFeedback(state);

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      formRef.current?.reset();
    }
  }, [mode, state]);

  const degreeTypeValue =
    readFormString(state.values?.degreeTypeCode) ||
    program?.degreeTypeCode ||
    "";
  const codeValue =
    readFormString(state.values?.code) || program?.code || "";
  const nameValue =
    readFormString(state.values?.name) || program?.name || "";
  const departmentValue =
    readFormString(state.values?.departmentId) || program?.departmentId || "";
  const sourceNoteValue =
    readFormString(state.values?.sourceNote) || program?.sourceNote || "";
  const coConstructedValue = state.values
    ? readFormBoolean(state.values.isCoConstructed)
    : (program?.isCoConstructed ?? false);
  const autoAcceptValue = state.values
    ? readFormBoolean(state.values.autoAccept)
    : (program?.autoAccept ?? false);
  const activeValue = state.values
    ? readFormBoolean(state.values.isActive)
    : (program?.isActive ?? true);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {program ? (
        <input type="hidden" name="programId" value={program.id} />
      ) : null}

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`program-degree-${mode}-${program?.id ?? "new"}`}
          name="degreeTypeCode"
          label={labels.fields.degreeType}
          defaultValue={degreeTypeValue}
          error={fieldErrors.degreeTypeCode}
          required
        >
          <option value="">{labels.fields.degreeTypePlaceholder}</option>
          {degreeTypes.map((degree) => (
            <option key={degree.code} value={degree.code}>
              {degree.label}
            </option>
          ))}
        </SelectField>

        {mode === "create" ? (
          <FormField
            id="program-code"
            name="code"
            label={labels.fields.code}
            placeholder={labels.fields.codePlaceholder}
            hint={labels.fields.codeHint}
            defaultValue={codeValue}
            error={fieldErrors.code}
            maxLength={20}
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
        ) : (
          <FormField
            id={`program-code-${program?.id ?? "edit"}`}
            label={labels.fields.code}
            hint={labels.fields.codeHint}
            defaultValue={program?.code ?? ""}
            disabled
            readOnly
          />
        )}
      </div>

      <FormField
        id={`program-name-${mode}-${program?.id ?? "new"}`}
        name="name"
        label={labels.fields.name}
        placeholder={labels.fields.namePlaceholder}
        defaultValue={nameValue}
        error={fieldErrors.name}
        maxLength={200}
        required
      />

      <SelectField
        id={`program-department-${mode}-${program?.id ?? "new"}`}
        name="departmentId"
        label={labels.fields.department}
        defaultValue={departmentValue}
        error={fieldErrors.departmentId}
      >
        <option value="">{labels.fields.departmentPlaceholder}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-3">
        <CheckboxField
          id={`program-co-constructed-${mode}-${program?.id ?? "new"}`}
          name="isCoConstructed"
          label={labels.fields.coConstructed}
          defaultChecked={coConstructedValue}
        />

        <CheckboxField
          id={`program-auto-accept-${mode}-${program?.id ?? "new"}`}
          name="autoAccept"
          label={labels.fields.autoAccept}
          hint={labels.fields.autoAcceptHint}
          defaultChecked={autoAcceptValue}
        />

        <CheckboxField
          id={`program-active-${mode}-${program?.id ?? "new"}`}
          name="isActive"
          label={labels.fields.active}
          defaultChecked={activeValue}
        />
      </div>

      <TextAreaField
        id={`program-source-${mode}-${program?.id ?? "new"}`}
        name="sourceNote"
        label={labels.fields.sourceNote}
        placeholder={labels.fields.sourceNotePlaceholder}
        hint={labels.fields.sourceNoteHint}
        defaultValue={sourceNoteValue}
        error={fieldErrors.sourceNote}
        maxLength={500}
      />

      <ManagementSubmitButton
        label={mode === "create" ? common.add : common.save}
        pendingLabel={mode === "create" ? common.adding : common.saving}
      />
    </form>
  );
}
