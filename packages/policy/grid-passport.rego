# Grid Passport — release policy
# Canonical source of truth for field visibility per role.
# Runtime currently mirrors this in apps/web/lib/policy.ts.
# To run OPA directly:  opa eval -d grid-passport.rego 'data.grid_passport.visible["utility"]'

package grid_passport

default allow := false

# -------------------------------------------------------------------
# Field classifications
# Every field that enters the system must be classified as one of:
#   public   — disclosed to all roles
#   private  — sealed in the confidential path; raw value never projected
#   derived  — computed from raw inputs; policy-governed release to all roles
# -------------------------------------------------------------------

field_class := {
  # public request metadata
  "request.applicantOrg":                    "public",
  "request.requestedMW":                     "public",
  "request.targetCOD":                       "public",
  "request.phases":                          "public",
  "request.site":                            "public",

  # private applicant inputs
  "private.flexPercent":                     "private",
  "private.redundancyShiftPercent":          "private",
  "private.backupGenHours":                  "private",
  "private.backupGenMW":                     "private",
  "private.bessMW":                          "private",
  "private.bessHours":                       "private",
  "private.internalScheduleConfidence":      "private",
  "private.workloadMix":                     "private",

  # public evidence (gathered from external sources)
  "public.floodRisk":                        "public",
  "public.permitRisk":                       "public",
  "public.zoningRisk":                       "public",
  "public.siteControlEvidence":              "public",
  "public.sourceRefs":                       "public",
  "public.notes":                            "public",

  # derived proofs (computed by the forecaster, released per policy)
  "derived.firmnessScore":                   "derived",
  "derived.expectedPeakMW":                  "derived",
  "derived.flexibilityPassport":             "derived",
  "derived.siteReadinessClass":              "derived",
  "derived.energizationBand":                "derived",
  "derived.costExposureClass":               "derived",
  "derived.topBlockers":                     "derived",
}

# -------------------------------------------------------------------
# Visibility rules by role
# -------------------------------------------------------------------

# Applicants see everything they submitted plus all derivations.
allow if {
  input.role == "applicant"
  field_class[input.field]
}

# Utilities see public metadata, public evidence, and derived proofs.
# Raw private fields are never projected into the utility view.
allow if {
  input.role == "utility"
  field_class[input.field] != "private"
}

# Regulators see the same projection as the utility plus visibility metadata.
# Raw private values are not shown, but counts and policy reason codes are.
allow if {
  input.role == "regulator"
  field_class[input.field] != "private"
}

# -------------------------------------------------------------------
# Release reason codes (for the audit trail)
# -------------------------------------------------------------------

reason := "public_disclosure" if {
  field_class[input.field] == "public"
}

reason := "derived_proof_release" if {
  field_class[input.field] == "derived"
}

reason := "sealed_raw_input" if {
  field_class[input.field] == "private"
  input.role != "applicant"
}

reason := "owner_read_own" if {
  field_class[input.field] == "private"
  input.role == "applicant"
}
