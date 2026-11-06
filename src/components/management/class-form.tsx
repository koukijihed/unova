"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { SelectField } from "@/components/management/form-fields";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import type {
  AcademicLevel,
  AcademicYear,
  ProgramTrack,
} from "@/lib/management/admin-data";
import { addClass } from "@/lib/management/program-actions";

type ClassFormProps = {
  programId: string;
  academicYears: AcademicYear[];
  levels: AcademicLevel[];
  tracks: ProgramTrack[];
  defaultYearId: string;
};

export function ClassForm({
  programId,
  academicYears,
  levels,
  tracks,
  defaultYearId,
}: ClassFormProps) {
  const [state, formAction] = useActionState(
    addClass,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.admin.programDetail;
  const common = fr.app.management.admin.common;
  useFormFeedback(state);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="programId" value={programId} />

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="class-year"
          name="academicYearId"
          label={labels.classYear}
          defaultValue={
            readFormString(state.values?.academicYearId) || defaultYearId
          }
          error={state.fieldErrors?.academicYearId}
          required
        >
          <option value="">{labels.classYearPlaceholder}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="class-level"
          name="levelCode"
          label={labels.classLevel}
          defaultValue={readFormString(state.values?.levelCode)}
          error={state.fieldErrors?.levelCode}
          required
        >
          <option value="">{labels.classLevelPlaceholder}</option>
          {levels.map((level) => (
            <option key={level.code} value={level.code}>
              {level.label}
            </option>
          ))}
        </SelectField>
      </div>

      <FormField
        id="class-name"
        name="name"
        label={labels.className}
        placeholder={labels.classNamePlaceholder}
        defaultValue={readFormString(state.values?.name)}
        error={state.fieldErrors?.name}
        maxLength={200}
        required
      />

      <SelectField
        id="class-track"
        name="trackId"
        label={labels.classTrack}
        defaultValue={readFormString(state.values?.trackId)}
        error={state.fieldErrors?.trackId}
      >
        <option value="">{labels.classTrackPlaceholder}</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.name}
          </option>
        ))}
      </SelectField>

      <ManagementSubmitButton label={common.add} pendingLabel={common.adding} />
    </form>
  );
}
