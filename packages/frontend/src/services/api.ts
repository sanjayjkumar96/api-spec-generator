// Types aligned with backend specification
export interface Job {
  jobId: string
  userId: string
  jobName: string
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN'
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  inputData: string
  s3OutputPath?: string
  createdAt: string
  updatedAt?: string
  completedAt?: string
  errorMessage?: string
  estimatedDuration?: number
  actualDuration?: number
  executionArn?: string
  output?: {
    // For simple jobs (EARS_SPEC, USER_STORY)
    content?: string
    
    // For complex jobs (INTEGRATION_PLAN) - include all IntegrationPlanOutput fields
    executiveSummary?: string
    architecture?: string
    apiSpecs?: string
    security?: string
    errorHandling?: string
    testing?: string
    deployment?: string
    monitoring?: string
    performance?: string
    risks?: string
    implementation?: string
    
    // Structured content
    sections?: Array<{
      id: string
      title: string
      content: string
      type: 'markdown' | 'mermaid' | 'code' | 'text'
      language?: string
      order: number
    }>
    diagrams?: Array<{
      id: string
      title: string
      content: string
      type: 'mermaid' | 'ascii' | 'text'
      category: 'high-level' | 'low-level' | 'data-flow' | 'deployment' | 'security' | 'component'
    }>
    codeTemplates?: Array<{
      id: string
      title: string
      content: string
      language: string
      category: 'interface' | 'dto' | 'service' | 'controller' | 'model' | 'config' | 'test' | 'schema'
      framework?: string
    }>
    projectStructure?: Array<{
      path: string
      type: 'file' | 'directory'
      description?: string
      content?: string
    }>
    
    // Consolidated content for legacy support
    consolidatedContent?: string
    integrationPlan?: string
    
    // Legacy support for existing frontend
    codeSnippets?: {
      client?: string
      dto?: string
    }
    
    // Additional legacy properties that may be present
    files?: string[]
    
    // Metadata
    metadata?: {
      structuredDataAvailable?: boolean
      structuredS3Key?: string
      consolidatedS3Key?: string
      generatedAt?: string
      version?: string
      modelId?: string
      timestamp?: string
      mockMode?: boolean
    }
  }
}

export interface CreateJobRequest {
  jobName: string
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN'
  inputData: string
}

export interface CreateJobResponse {
  jobId: string
}

export interface JobsResponse {
  success: boolean
  data: {
    jobs: Job[]
  }
}

// Import axios and auth service for consistent HTTP client usage
import axios from 'axios'
import { authService } from './authService'

// API Base URL - same approach as authService
const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://s1mmzhde8j.execute-api.ap-south-1.amazonaws.com/Prod'

class ApiService {
  constructor() {
    console.log('API Base URL:', API_BASE_URL)
    console.log('Current hostname:', window.location.hostname)
    console.log('Environment variables:', {
      VITE_API_ENDPOINT: import.meta.env.VITE_API_ENDPOINT,
      VITE_API_URL: import.meta.env.VITE_API_URL
    })
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      console.log(`Making ${method} request to ${endpoint}`, {
        hasToken: !!authService.getToken(),
        baseURL: API_BASE_URL
      })

      const config: any = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept-Encoding': 'gzip, deflate, br', // Explicitly support common encodings
          'X-Requested-With': 'XMLHttpRequest' // Help identify AJAX requests
        },
        withCredentials: false,
        timeout: 60000, // 60 second timeout for longer operations
        // Ensure axios handles decompression properly
        decompress: true,
        ...(data && { data })
      }

      // Add auth token if available
      const token = authService.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      const response = await axios(config)
      return response.data
    } catch (error: any) {
      console.error(`API request failed: ${method} ${endpoint}`, error)
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('API: Unauthorized - token may be invalid')
        authService.logout()
        throw new Error('Authentication failed: Your session may have expired. Please log in again.')
      }
      
      if (error.code === 'ERR_CONTENT_DECODING_FAILED') {
        console.error('API: Content decoding error detected:', error)
        throw new Error('Server response error: Unable to decode content. Please try again.')
      }
      
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        console.error('API: Network or CORS error detected:', error)
        throw new Error('Network error: Unable to connect to the server. Please try again.')
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      
      if (error.response?.status) {
        throw new Error(`Request failed with status ${error.response.status}: ${error.response.statusText}`)
      }
      
      throw error instanceof Error ? error : new Error('An unexpected error occurred')
    }
  }

  async createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
    try {
      const response = await this.makeRequest('POST', '/jobs', request)
      console.log('Create job response:', response)
      
      // Handle the simplified response format from plan specification
      if (response.jobId) {
        return { jobId: response.jobId }
      }
      
      throw new Error('Invalid response format: missing jobId')
    } catch (error) {
      console.error('Create job error:', error)
      throw error instanceof Error ? error : new Error('Failed to create job')
    }
  }

  async getJobs(): Promise<Job[]> {
    try {
      const response: JobsResponse = await this.makeRequest('GET', '/jobs')
      return response.data.jobs
    } catch (error) {
      console.error('Get jobs error:', error)
      throw error instanceof Error ? error : new Error('Failed to fetch jobs')
    }
  }

  async getJob(jobId: string): Promise<Job> {
    try {
      const response = await this.makeRequest('GET', `/jobs/${jobId}`)
      
      // Handle direct job response format from plan specification
      if (response.jobId) {
        return response as Job
      }
      
      throw new Error('Invalid job response format')
    } catch (error) {
      console.error('Get job error:', error)
      throw error instanceof Error ? error : new Error('Failed to fetch job')
    }
  }

  async getJobStatus(jobId: string) {
    try {
      const response = await this.makeRequest('GET', `/jobs/${jobId}/status`)
      return response.data
    } catch (error) {
      console.error('Get job status error:', error)
      throw error instanceof Error ? error : new Error('Failed to fetch job status')
    }
  }
}

export const apiService = new ApiService()
export const api = apiService