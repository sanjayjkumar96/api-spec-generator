# Salesforce Health Cloud Object Schemas and Field Mappings

## Standard Objects Extended for Health Cloud

### Contact (Patient Records)
The Contact object is extended with health-specific fields for patient management.

#### Standard Fields
```json
{
  "Id": "Contact ID (18-character)",
  "FirstName": "Patient first name",
  "LastName": "Patient last name (required)",
  "Email": "Patient email address",
  "Phone": "Primary phone number",
  "MobilePhone": "Mobile phone number",
  "Birthdate": "Date of birth",
  "MailingStreet": "Mailing address street",
  "MailingCity": "Mailing address city",
  "MailingState": "Mailing address state",
  "MailingPostalCode": "Mailing address postal code",
  "MailingCountry": "Mailing address country",
  "CreatedDate": "Record creation timestamp",
  "LastModifiedDate": "Last modification timestamp",
  "OwnerId": "Record owner (User or Queue)"
}
```

#### Health Cloud Extended Fields
```json
{
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID",
  "HealthCloudGA__Gender__c": "Patient gender (M/F/Other/Unknown)",
  "HealthCloudGA__PrimaryLanguage__c": "Preferred communication language",
  "HealthCloudGA__PreferredName__c": "Preferred name for patient",
  "HealthCloudGA__DeceasedDate__c": "Date of death (if applicable)",
  "HealthCloudGA__IsDeceased__c": "Deceased indicator",
  "HealthCloudGA__IndividualId__c": "Link to Individual record",
  "HealthCloudGA__TotalHouseholdSize__c": "Number of household members",
  "HealthCloudGA__Age__c": "Calculated age field"
}
```

#### REST API Field Mappings (camelCase)
```json
{
  "id": "Id",
  "firstName": "FirstName",
  "lastName": "LastName",
  "email": "Email",
  "phoneNumber": "Phone",
  "mobilePhone": "MobilePhone",
  "dateOfBirth": "Birthdate",
  "address": {
    "street": "MailingStreet",
    "city": "MailingCity",
    "state": "MailingState",
    "postalCode": "MailingPostalCode",
    "country": "MailingCountry"
  },
  "gender": "HealthCloudGA__Gender__c",
  "preferredLanguage": "HealthCloudGA__PrimaryLanguage__c",
  "preferredName": "HealthCloudGA__PreferredName__c",
  "isDeceased": "HealthCloudGA__IsDeceased__c",
  "deceasedDate": "HealthCloudGA__DeceasedDate__c",
  "age": "HealthCloudGA__Age__c",
  "householdSize": "HealthCloudGA__TotalHouseholdSize__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c",
  "createdAt": "CreatedDate",
  "updatedAt": "LastModifiedDate",
  "ownerId": "OwnerId"
}
```

## Health Cloud Specific Objects

### HealthCloudGA__CareProgram__c
Care programs define structured healthcare programs for specific conditions or populations.

#### Object Schema
```json
{
  "Id": "Unique identifier",
  "Name": "Program name (required)",
  "HealthCloudGA__Description__c": "Program description",
  "HealthCloudGA__StartDate__c": "Program start date",
  "HealthCloudGA__EndDate__c": "Program end date",
  "HealthCloudGA__Status__c": "Active|Inactive|Draft|Archived",
  "HealthCloudGA__Active__c": "Active status indicator",
  "HealthCloudGA__Category__c": "Program category",
  "HealthCloudGA__Type__c": "Program type",
  "HealthCloudGA__Priority__c": "Low|Medium|High|Critical",
  "HealthCloudGA__TargetPopulation__c": "Target patient population",
  "HealthCloudGA__Goals__c": "Program goals and objectives",
  "HealthCloudGA__EnrollmentCriteria__c": "Enrollment criteria",
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID",
  "CreatedDate": "Creation timestamp",
  "LastModifiedDate": "Last modification timestamp",
  "OwnerId": "Record owner"
}
```

#### REST API Mapping
```json
{
  "id": "Id",
  "name": "Name",
  "description": "HealthCloudGA__Description__c",
  "startDate": "HealthCloudGA__StartDate__c",
  "endDate": "HealthCloudGA__EndDate__c",
  "status": "HealthCloudGA__Status__c",
  "isActive": "HealthCloudGA__Active__c",
  "category": "HealthCloudGA__Category__c",
  "type": "HealthCloudGA__Type__c",
  "priority": "HealthCloudGA__Priority__c",
  "targetPopulation": "HealthCloudGA__TargetPopulation__c",
  "goals": "HealthCloudGA__Goals__c",
  "enrollmentCriteria": "HealthCloudGA__EnrollmentCriteria__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c",
  "createdAt": "CreatedDate",
  "updatedAt": "LastModifiedDate",
  "ownerId": "OwnerId"
}
```

### HealthCloudGA__CarePlan__c
Individual patient care plans that define specific care coordination activities.

#### Object Schema
```json
{
  "Id": "Unique identifier",
  "Name": "Care plan name (required)",
  "HealthCloudGA__Patient__c": "Patient reference (Contact)",
  "HealthCloudGA__CareProgram__c": "Care program reference",
  "HealthCloudGA__Status__c": "Active|Inactive|Complete|On Hold",
  "HealthCloudGA__Priority__c": "Low|Medium|High|Critical",
  "HealthCloudGA__StartDate__c": "Plan start date",
  "HealthCloudGA__EndDate__c": "Plan end date",
  "HealthCloudGA__Description__c": "Plan description",
  "HealthCloudGA__Goals__c": "Care goals",
  "HealthCloudGA__Notes__c": "Additional notes",
  "HealthCloudGA__Provider__c": "Primary care provider",
  "HealthCloudGA__CareCoordinator__c": "Care coordinator",
  "HealthCloudGA__NextReviewDate__c": "Next review date",
  "HealthCloudGA__CompletionPercentage__c": "Completion percentage",
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID",
  "CreatedDate": "Creation timestamp",
  "LastModifiedDate": "Last modification timestamp"
}
```

#### REST API Mapping
```json
{
  "id": "Id",
  "name": "Name",
  "patientId": "HealthCloudGA__Patient__c",
  "careProgramId": "HealthCloudGA__CareProgram__c",
  "status": "HealthCloudGA__Status__c",
  "priority": "HealthCloudGA__Priority__c",
  "startDate": "HealthCloudGA__StartDate__c",
  "endDate": "HealthCloudGA__EndDate__c",
  "description": "HealthCloudGA__Description__c",
  "goals": "HealthCloudGA__Goals__c",
  "notes": "HealthCloudGA__Notes__c",
  "providerId": "HealthCloudGA__Provider__c",
  "careCoordinatorId": "HealthCloudGA__CareCoordinator__c",
  "nextReviewDate": "HealthCloudGA__NextReviewDate__c",
  "completionPercentage": "HealthCloudGA__CompletionPercentage__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c",
  "createdAt": "CreatedDate",
  "updatedAt": "LastModifiedDate"
}
```

### HealthCloudGA__CareTask__c
Individual care tasks and activities within care plans.

#### Object Schema
```json
{
  "Id": "Unique identifier",
  "Subject": "Task subject (required)",
  "HealthCloudGA__Patient__c": "Patient reference",
  "HealthCloudGA__CarePlan__c": "Care plan reference",
  "HealthCloudGA__Status__c": "Not Started|In Progress|Completed|Cancelled",
  "HealthCloudGA__Priority__c": "Low|Medium|High|Critical",
  "HealthCloudGA__DueDate__c": "Task due date",
  "HealthCloudGA__CompletedDate__c": "Task completion date",
  "HealthCloudGA__AssignedTo__c": "Assigned user",
  "HealthCloudGA__Description__c": "Task description",
  "HealthCloudGA__Type__c": "Task type",
  "HealthCloudGA__Category__c": "Task category",
  "HealthCloudGA__EstimatedEffort__c": "Estimated effort in hours",
  "HealthCloudGA__ActualEffort__c": "Actual effort in hours",
  "HealthCloudGA__CompletionNotes__c": "Completion notes",
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID"
}
```

#### REST API Mapping
```json
{
  "id": "Id",
  "subject": "Subject",
  "patientId": "HealthCloudGA__Patient__c",
  "carePlanId": "HealthCloudGA__CarePlan__c",
  "status": "HealthCloudGA__Status__c",
  "priority": "HealthCloudGA__Priority__c",
  "dueDate": "HealthCloudGA__DueDate__c",
  "completedDate": "HealthCloudGA__CompletedDate__c",
  "assignedTo": "HealthCloudGA__AssignedTo__c",
  "description": "HealthCloudGA__Description__c",
  "type": "HealthCloudGA__Type__c",
  "category": "HealthCloudGA__Category__c",
  "estimatedEffort": "HealthCloudGA__EstimatedEffort__c",
  "actualEffort": "HealthCloudGA__ActualEffort__c",
  "completionNotes": "HealthCloudGA__CompletionNotes__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c"
}
```

### HealthCloudGA__EhrObservation__c
Clinical observations including vital signs, lab results, and measurements.

#### Object Schema
```json
{
  "Id": "Unique identifier",
  "Name": "Observation name (auto-generated)",
  "HealthCloudGA__Patient__c": "Patient reference (required)",
  "HealthCloudGA__ObservationCode__c": "LOINC or local code",
  "HealthCloudGA__ObservationCodeText__c": "Code description",
  "HealthCloudGA__ValueQuantity__c": "Numeric value",
  "HealthCloudGA__ValueUnit__c": "Unit of measure",
  "HealthCloudGA__ValueText__c": "Text value",
  "HealthCloudGA__ValueCodedText__c": "Coded text value",
  "HealthCloudGA__ObservationDateTime__c": "Observation date/time",
  "HealthCloudGA__Status__c": "final|preliminary|cancelled|entered-in-error",
  "HealthCloudGA__Category__c": "vital-signs|laboratory|survey",
  "HealthCloudGA__ReferenceRangeHigh__c": "Reference range high",
  "HealthCloudGA__ReferenceRangeLow__c": "Reference range low",
  "HealthCloudGA__IsAbnormal__c": "Abnormal result indicator",
  "HealthCloudGA__Provider__c": "Observing provider",
  "HealthCloudGA__Location__c": "Observation location",
  "HealthCloudGA__Notes__c": "Clinical notes",
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID"
}
```

#### REST API Mapping
```json
{
  "id": "Id",
  "name": "Name",
  "patientId": "HealthCloudGA__Patient__c",
  "observationCode": "HealthCloudGA__ObservationCode__c",
  "observationCodeText": "HealthCloudGA__ObservationCodeText__c",
  "value": {
    "quantity": "HealthCloudGA__ValueQuantity__c",
    "unit": "HealthCloudGA__ValueUnit__c",
    "text": "HealthCloudGA__ValueText__c",
    "codedText": "HealthCloudGA__ValueCodedText__c"
  },
  "observedAt": "HealthCloudGA__ObservationDateTime__c",
  "status": "HealthCloudGA__Status__c",
  "category": "HealthCloudGA__Category__c",
  "referenceRange": {
    "high": "HealthCloudGA__ReferenceRangeHigh__c",
    "low": "HealthCloudGA__ReferenceRangeLow__c"
  },
  "isAbnormal": "HealthCloudGA__IsAbnormal__c",
  "providerId": "HealthCloudGA__Provider__c",
  "locationId": "HealthCloudGA__Location__c",
  "notes": "HealthCloudGA__Notes__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c"
}
```

### HealthCloudGA__EhrMedicationPrescription__c
Medication prescriptions and medication management.

#### Object Schema
```json
{
  "Id": "Unique identifier",
  "Name": "Prescription name (auto-generated)",
  "HealthCloudGA__Patient__c": "Patient reference (required)",
  "HealthCloudGA__MedicationName__c": "Medication name",
  "HealthCloudGA__MedicationCode__c": "NDC or RxNorm code",
  "HealthCloudGA__Dosage__c": "Dosage amount",
  "HealthCloudGA__DosageUnit__c": "Dosage unit",
  "HealthCloudGA__Frequency__c": "Frequency of administration",
  "HealthCloudGA__Route__c": "Route of administration",
  "HealthCloudGA__StartDate__c": "Prescription start date",
  "HealthCloudGA__EndDate__c": "Prescription end date",
  "HealthCloudGA__Quantity__c": "Quantity prescribed",
  "HealthCloudGA__Refills__c": "Number of refills",
  "HealthCloudGA__Status__c": "active|completed|cancelled|stopped",
  "HealthCloudGA__Prescriber__c": "Prescribing provider",
  "HealthCloudGA__Pharmacy__c": "Dispensing pharmacy",
  "HealthCloudGA__Instructions__c": "Patient instructions",
  "HealthCloudGA__Indication__c": "Indication for prescription",
  "HealthCloudGA__SourceSystem__c": "Source system identifier",
  "HealthCloudGA__SourceSystemId__c": "External system record ID"
}
```

#### REST API Mapping
```json
{
  "id": "Id",
  "name": "Name",
  "patientId": "HealthCloudGA__Patient__c",
  "medicationName": "HealthCloudGA__MedicationName__c",
  "medicationCode": "HealthCloudGA__MedicationCode__c",
  "dosage": {
    "amount": "HealthCloudGA__Dosage__c",
    "unit": "HealthCloudGA__DosageUnit__c"
  },
  "frequency": "HealthCloudGA__Frequency__c",
  "route": "HealthCloudGA__Route__c",
  "startDate": "HealthCloudGA__StartDate__c",
  "endDate": "HealthCloudGA__EndDate__c",
  "quantity": "HealthCloudGA__Quantity__c",
  "refills": "HealthCloudGA__Refills__c",
  "status": "HealthCloudGA__Status__c",
  "prescriberId": "HealthCloudGA__Prescriber__c",
  "pharmacyId": "HealthCloudGA__Pharmacy__c",
  "instructions": "HealthCloudGA__Instructions__c",
  "indication": "HealthCloudGA__Indication__c",
  "sourceSystem": "HealthCloudGA__SourceSystem__c",
  "sourceSystemId": "HealthCloudGA__SourceSystemId__c"
}
```

## Field Type Mappings

### Salesforce to REST API Data Types
```json
{
  "Text": "string",
  "LongTextArea": "string",
  "RichTextArea": "string (HTML)",
  "Email": "string (email format)",
  "Phone": "string (phone format)",
  "Url": "string (URL format)",
  "Number": "number",
  "Currency": "number (decimal)",
  "Percent": "number (decimal)",
  "Date": "string (ISO 8601 date)",
  "DateTime": "string (ISO 8601 datetime)",
  "Checkbox": "boolean",
  "Picklist": "string (enum values)",
  "MultiselectPicklist": "array of strings",
  "Lookup": "string (ID reference)",
  "MasterDetail": "string (ID reference)",
  "Formula": "varies (based on return type)",
  "Geolocation": "object {latitude: number, longitude: number}"
}
```

## Validation Rules and Constraints

### Standard Validation Patterns
```json
{
  "email": "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$",
  "phone": "^\\+?[1-9]\\d{1,14}$",
  "zipCode": "^\\d{5}(-\\d{4})?$",
  "ssn": "^\\d{3}-\\d{2}-\\d{4}$",
  "medicareId": "^\\d{3}-\\d{2}-\\d{4}[A-Za-z]?$",
  "npi": "^\\d{10}$"
}
```

### Required Fields by Object
```json
{
  "Contact": ["LastName"],
  "HealthCloudGA__CareProgram__c": ["Name"],
  "HealthCloudGA__CarePlan__c": ["Name", "HealthCloudGA__Patient__c"],
  "HealthCloudGA__CareTask__c": ["Subject"],
  "HealthCloudGA__EhrObservation__c": ["HealthCloudGA__Patient__c"],
  "HealthCloudGA__EhrMedicationPrescription__c": ["HealthCloudGA__Patient__c"]
}
```

This schema documentation provides the foundation for building robust integrations with Salesforce Health Cloud, ensuring proper data mapping and field transformations between systems.