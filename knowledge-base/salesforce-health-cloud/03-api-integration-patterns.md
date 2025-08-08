# Salesforce Health Cloud API Integration Patterns

## Real-time Integration with jsforce

### Connection Setup
```typescript
import jsforce from 'jsforce';

const connection = new jsforce.Connection({
  loginUrl: 'https://login.salesforce.com',
  version: '58.0'
});

await connection.login(username, password + securityToken);
```

### Streaming API Integration
Salesforce Streaming API enables real-time data synchronization using PushTopics and Change Data Capture (CDC).

#### PushTopic Configuration
```typescript
const pushTopic = {
  Name: 'PatientUpdates',
  Query: `SELECT Id, FirstName, LastName, Email, HealthCloudGA__Gender__c, 
          CreatedDate, LastModifiedDate FROM Contact 
          WHERE HealthCloudGA__SourceSystem__c != null`,
  ApiVersion: 58.0,
  NotifyForOperationCreate: true,
  NotifyForOperationUpdate: true,
  NotifyForOperationDelete: true,
  NotifyForFields: 'All',
  Description: 'Real-time patient data changes'
};

await connection.sobject('PushTopic').create(pushTopic);
```

#### Streaming Subscription
```typescript
const subscription = connection.streaming.topic('PatientUpdates')
  .subscribe((message) => {
    console.log('Received patient update:', message);
    handlePatientChange(message);
  });
```

### Change Data Capture (CDC)
CDC provides more robust change tracking without query limits.

#### Enable CDC for Health Cloud Objects
```typescript
// Enable CDC via Salesforce Setup or API
const cdcObjects = [
  'ContactChangeEvent',
  'HealthCloudGA__CareProgram__cChangeEvent',
  'HealthCloudGA__CarePlan__cChangeEvent',
  'HealthCloudGA__CareTask__cChangeEvent'
];

cdcObjects.forEach(objectName => {
  connection.streaming.topic(objectName).subscribe((event) => {
    processChangeEvent(event);
  });
});
```

## REST API Patterns

### CRUD Operations with Field Mapping

#### Create Patient Record
```typescript
async function createPatient(restApiData: PatientRestApi): Promise<string> {
  const salesforceData = {
    FirstName: restApiData.firstName,
    LastName: restApiData.lastName,
    Email: restApiData.email,
    Phone: restApiData.phoneNumber,
    Birthdate: restApiData.dateOfBirth,
    MailingStreet: restApiData.address?.street,
    MailingCity: restApiData.address?.city,
    MailingState: restApiData.address?.state,
    MailingPostalCode: restApiData.address?.postalCode,
    HealthCloudGA__Gender__c: restApiData.gender,
    HealthCloudGA__PrimaryLanguage__c: restApiData.preferredLanguage,
    HealthCloudGA__SourceSystem__c: 'ExternalSystem',
    HealthCloudGA__SourceSystemId__c: restApiData.externalId
  };

  const result = await connection.sobject('Contact').create(salesforceData);
  return result.id;
}
```

#### Query Patients with Transformation
```typescript
async function getPatients(filters?: PatientFilters): Promise<PatientRestApi[]> {
  let soql = `
    SELECT Id, FirstName, LastName, Email, Phone, Birthdate,
           MailingStreet, MailingCity, MailingState, MailingPostalCode,
           HealthCloudGA__Gender__c, HealthCloudGA__PrimaryLanguage__c,
           HealthCloudGA__Age__c, CreatedDate, LastModifiedDate
    FROM Contact
    WHERE HealthCloudGA__SourceSystem__c != null
  `;

  if (filters?.startDate) {
    soql += ` AND CreatedDate >= ${filters.startDate}`;
  }
  
  if (filters?.gender) {
    soql += ` AND HealthCloudGA__Gender__c = '${filters.gender}'`;
  }

  const result = await connection.query(soql);
  
  return result.records.map(transformPatientToRestApi);
}

function transformPatientToRestApi(sfRecord: any): PatientRestApi {
  return {
    id: sfRecord.Id,
    firstName: sfRecord.FirstName,
    lastName: sfRecord.LastName,
    email: sfRecord.Email,
    phoneNumber: sfRecord.Phone,
    dateOfBirth: sfRecord.Birthdate,
    address: {
      street: sfRecord.MailingStreet,
      city: sfRecord.MailingCity,
      state: sfRecord.MailingState,
      postalCode: sfRecord.MailingPostalCode
    },
    gender: sfRecord.HealthCloudGA__Gender__c,
    preferredLanguage: sfRecord.HealthCloudGA__PrimaryLanguage__c,
    age: sfRecord.HealthCloudGA__Age__c,
    createdAt: sfRecord.CreatedDate,
    updatedAt: sfRecord.LastModifiedDate
  };
}
```

### Care Program Management

#### Create Care Program
```typescript
async function createCareProgram(restApiData: CareProgramRestApi): Promise<string> {
  const salesforceData = {
    Name: restApiData.name,
    HealthCloudGA__Description__c: restApiData.description,
    HealthCloudGA__StartDate__c: restApiData.startDate,
    HealthCloudGA__EndDate__c: restApiData.endDate,
    HealthCloudGA__Status__c: restApiData.status,
    HealthCloudGA__Active__c: restApiData.isActive,
    HealthCloudGA__Category__c: restApiData.category,
    HealthCloudGA__Priority__c: restApiData.priority,
    HealthCloudGA__TargetPopulation__c: restApiData.targetPopulation,
    HealthCloudGA__Goals__c: restApiData.goals,
    HealthCloudGA__SourceSystem__c: 'ExternalSystem',
    HealthCloudGA__SourceSystemId__c: restApiData.externalId
  };

  const result = await connection.sobject('HealthCloudGA__CareProgram__c').create(salesforceData);
  return result.id;
}
```

#### Enroll Patient in Care Program
```typescript
async function enrollPatientInProgram(
  patientId: string, 
  careProgramId: string,
  enrollmentData: EnrollmentRestApi
): Promise<string> {
  const carePlanData = {
    Name: `${enrollmentData.programName} - ${enrollmentData.patientName}`,
    HealthCloudGA__Patient__c: patientId,
    HealthCloudGA__CareProgram__c: careProgramId,
    HealthCloudGA__Status__c: 'Active',
    HealthCloudGA__StartDate__c: enrollmentData.startDate,
    HealthCloudGA__Priority__c: enrollmentData.priority || 'Medium',
    HealthCloudGA__Description__c: enrollmentData.description,
    HealthCloudGA__Goals__c: enrollmentData.goals
  };

  const result = await connection.sobject('HealthCloudGA__CarePlan__c').create(carePlanData);
  return result.id;
}
```

### Clinical Data Integration

#### Create Clinical Observation
```typescript
async function createObservation(restApiData: ObservationRestApi): Promise<string> {
  const salesforceData = {
    HealthCloudGA__Patient__c: restApiData.patientId,
    HealthCloudGA__ObservationCode__c: restApiData.observationCode,
    HealthCloudGA__ObservationCodeText__c: restApiData.observationCodeText,
    HealthCloudGA__ValueQuantity__c: restApiData.value?.quantity,
    HealthCloudGA__ValueUnit__c: restApiData.value?.unit,
    HealthCloudGA__ValueText__c: restApiData.value?.text,
    HealthCloudGA__ObservationDateTime__c: restApiData.observedAt,
    HealthCloudGA__Status__c: restApiData.status,
    HealthCloudGA__Category__c: restApiData.category,
    HealthCloudGA__ReferenceRangeHigh__c: restApiData.referenceRange?.high,
    HealthCloudGA__ReferenceRangeLow__c: restApiData.referenceRange?.low,
    HealthCloudGA__IsAbnormal__c: restApiData.isAbnormal,
    HealthCloudGA__Provider__c: restApiData.providerId,
    HealthCloudGA__Notes__c: restApiData.notes,
    HealthCloudGA__SourceSystem__c: 'EHR_System',
    HealthCloudGA__SourceSystemId__c: restApiData.externalId
  };

  const result = await connection.sobject('HealthCloudGA__EhrObservation__c').create(salesforceData);
  return result.id;
}
```

#### Bulk Clinical Data Upload
```typescript
async function bulkCreateObservations(observations: ObservationRestApi[]): Promise<void> {
  const salesforceRecords = observations.map(obs => ({
    HealthCloudGA__Patient__c: obs.patientId,
    HealthCloudGA__ObservationCode__c: obs.observationCode,
    HealthCloudGA__ValueQuantity__c: obs.value?.quantity,
    HealthCloudGA__ValueUnit__c: obs.value?.unit,
    HealthCloudGA__ObservationDateTime__c: obs.observedAt,
    HealthCloudGA__Status__c: obs.status,
    HealthCloudGA__SourceSystem__c: 'EHR_System',
    HealthCloudGA__SourceSystemId__c: obs.externalId
  }));

  // Use Bulk API for large datasets
  const job = connection.bulk.createJob('HealthCloudGA__EhrObservation__c', 'insert');
  const batch = job.createBatch();
  
  batch.execute(salesforceRecords);
  
  await new Promise((resolve, reject) => {
    batch.on('response', resolve);
    batch.on('error', reject);
  });
}
```

## Error Handling and Resilience

### Retry Mechanisms
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
}
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeoutMs: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Data Synchronization Patterns

### Bidirectional Sync with Conflict Resolution
```typescript
interface SyncRecord {
  id: string;
  lastModified: string;
  data: any;
  source: 'salesforce' | 'external';
}

class DataSynchronizer {
  async sync(salesforceRecord: SyncRecord, externalRecord: SyncRecord): Promise<void> {
    if (!salesforceRecord && externalRecord) {
      // Create in Salesforce
      await this.createInSalesforce(externalRecord.data);
    } else if (salesforceRecord && !externalRecord) {
      // Create in external system
      await this.createInExternalSystem(salesforceRecord.data);
    } else if (salesforceRecord && externalRecord) {
      // Resolve conflicts
      await this.resolveConflict(salesforceRecord, externalRecord);
    }
  }

  private async resolveConflict(sfRecord: SyncRecord, extRecord: SyncRecord): Promise<void> {
    const sfTime = new Date(sfRecord.lastModified).getTime();
    const extTime = new Date(extRecord.lastModified).getTime();

    if (sfTime > extTime) {
      // Salesforce is newer, update external system
      await this.updateExternalSystem(sfRecord.data);
    } else if (extTime > sfTime) {
      // External system is newer, update Salesforce
      await this.updateSalesforce(extRecord.data);
    }
    // If timestamps are equal, apply business rules for conflict resolution
  }
}
```

### Delta Sync Implementation
```typescript
class DeltaSync {
  private lastSyncTimestamp: string;

  async performDeltaSync(): Promise<void> {
    const changes = await this.getSalesforceChanges(this.lastSyncTimestamp);
    
    for (const change of changes) {
      await this.processChange(change);
    }
    
    this.lastSyncTimestamp = new Date().toISOString();
    await this.saveSyncTimestamp(this.lastSyncTimestamp);
  }

  private async getSalesforceChanges(since: string): Promise<any[]> {
    const soql = `
      SELECT Id, LastModifiedDate, (SELECT Id FROM HealthCloudGA__CarePlans__r)
      FROM Contact 
      WHERE LastModifiedDate > ${since}
      ORDER BY LastModifiedDate ASC
    `;
    
    const result = await connection.query(soql);
    return result.records;
  }

  private async processChange(change: any): Promise<void> {
    const transformedData = transformPatientToRestApi(change);
    await this.sendToExternalSystem(transformedData);
  }
}
```

## Performance Optimization

### Query Optimization
```typescript
// Efficient querying with selective fields and indexes
const optimizedQuery = `
  SELECT Id, FirstName, LastName, Email, 
         HealthCloudGA__Gender__c, LastModifiedDate
  FROM Contact 
  WHERE HealthCloudGA__SourceSystem__c = 'EHR'
    AND LastModifiedDate > YESTERDAY
  ORDER BY LastModifiedDate ASC
  LIMIT 1000
`;

// Use indexed fields for better performance
const indexedQuery = `
  SELECT Id, Name, HealthCloudGA__Status__c
  FROM HealthCloudGA__CareProgram__c
  WHERE HealthCloudGA__Active__c = true
    AND CreatedDate = TODAY
`;
```

### Caching Strategy
```typescript
class HealthCloudCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  async getPatient(patientId: string): Promise<any> {
    const cached = this.cache.get(patientId);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const patient = await this.fetchPatientFromSalesforce(patientId);
    
    this.cache.set(patientId, {
      data: patient,
      expiry: Date.now() + this.TTL
    });

    return patient;
  }

  invalidate(patientId: string): void {
    this.cache.delete(patientId);
  }
}
```

## Monitoring and Observability

### API Usage Monitoring
```typescript
class ApiMonitor {
  private apiCalls = 0;
  private readonly dailyLimit = 15000;

  async makeApiCall(operation: () => Promise<any>): Promise<any> {
    if (this.apiCalls >= this.dailyLimit) {
      throw new Error('Daily API limit exceeded');
    }

    const startTime = Date.now();
    try {
      const result = await operation();
      this.apiCalls++;
      
      console.log(`API call completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  getRemainingCalls(): number {
    return this.dailyLimit - this.apiCalls;
  }
}
```

### Health Check Implementation
```typescript
async function healthCheck(): Promise<HealthStatus> {
  try {
    // Test Salesforce connectivity
    await connection.query('SELECT Id FROM User LIMIT 1');
    
    // Test streaming connection
    const isStreamingActive = connection.streaming._isConnected();
    
    return {
      salesforce: 'healthy',
      streaming: isStreamingActive ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      salesforce: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

This comprehensive API integration pattern guide provides the foundation for building robust, real-time integrations with Salesforce Health Cloud using industry best practices and proven patterns.