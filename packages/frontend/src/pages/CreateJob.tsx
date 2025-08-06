import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiService, CreateJobRequest } from '@/services/api'
import { FileText, Users, GitBranch, Loader2, ArrowLeft } from 'lucide-react'
import { PromptTemplates } from '@/components/PromptTemplates'

interface FormData {
  jobName: string
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN'
  inputData: string
}

const CreateJob: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<FormData['jobType']>('EARS_SPEC')
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    defaultValues: {
      jobType: 'EARS_SPEC',
      jobName: '',
      inputData: ''
    }
  })

  const createJobMutation = useMutation({
    mutationFn: (data: CreateJobRequest) => apiService.createJob(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      navigate(`/jobs/${response.jobId}`)
    },
    onError: (error: any) => {
      console.error('Failed to create job:', error)
    }
  })

  const onSubmit = (data: FormData) => {
    // Use the simplified API request format from plan specification
    const apiRequest: CreateJobRequest = {
      jobName: data.jobName,
      jobType: selectedType,
      inputData: data.inputData
    }
    console.log('Submitting job:', apiRequest)
    createJobMutation.mutate(apiRequest)
  }

  const handleTemplateSelect = (templateContent: string) => {
    setValue('inputData', templateContent)
  }

  // Update both state and form when job type changes
  const handleJobTypeChange = (jobType: FormData['jobType']) => {
    console.log('Job type changed to:', jobType)
    setSelectedType(jobType)
    setValue('jobType', jobType)
  }

  const jobTypes = [
    {
      id: 'EARS_SPEC' as const,
      title: 'EARS Specification',
      description: 'Generate formal EARS requirements from raw project notes',
      icon: <FileText className="h-6 w-6" />,
      placeholder: 'Paste your raw project notes here. Include any requirements, features, constraints, and business rules you want to formalize into EARS specification...',
      example: 'System for managing customer orders. Must handle online orders, inventory tracking, payment processing. Should support multiple payment methods and real-time inventory updates.'
    },
    {
      id: 'USER_STORY' as const,
      title: 'User Story',
      description: 'Transform concepts into Agile user stories with acceptance criteria',
      icon: <Users className="h-6 w-6" />,
      placeholder: 'Describe the feature or functionality from a user perspective. Include the target users, their goals, and expected outcomes...',
      example: 'As a customer, I want to track my order status so that I know when my package will arrive. The system should send notifications for status changes.'
    },
    {
      id: 'INTEGRATION_PLAN' as const,
      title: 'API Integration Plan',
      description: 'Generate comprehensive integration plan with diagrams, code, and project structure',
      icon: <GitBranch className="h-6 w-6" />,
      placeholder: 'Paste the EARS specifications for the systems you need to integrate. Include API requirements, data flow, and integration patterns...',
      example: 'EARS specifications for integrating payment gateway with e-commerce platform. Need to handle payment processing, webhooks, and error scenarios.'
    }
  ]

  const currentJobType = jobTypes.find(type => type.id === selectedType)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-600">Generate AI-powered specifications and integration plans</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Job Type Selection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Job Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jobTypes.map((type) => (
              <div
                key={type.id}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedType === type.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  handleJobTypeChange(type.id)
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedType === type.id
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {errors.jobType && (
            <p className="mt-2 text-sm text-red-600">{errors.jobType.message}</p>
          )}
        </div>

        {/* Job Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
          
          {/* Job Name */}
          <div className="mb-6">
            <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 mb-2">
              Job Name
            </label>
            <input
              type="text"
              id="jobName"
              {...register('jobName', { 
                required: 'Job name is required',
                minLength: { value: 3, message: 'Job name must be at least 3 characters' }
              })}
              className="input-field"
              placeholder="Enter a descriptive name for your job"
            />
            {errors.jobName && (
              <p className="mt-1 text-sm text-red-600">{errors.jobName.message}</p>
            )}
          </div>

          {/* Input Data */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="inputData" className="block text-sm font-medium text-gray-700">
                Input Data
              </label>
              <PromptTemplates
                selectedJobType={selectedType}
                onTemplateSelect={handleTemplateSelect}
              />
            </div>
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Example for {currentJobType?.title}:
              </p>
              <p className="text-sm text-blue-700 italic">
                {currentJobType?.example}
              </p>
            </div>
            <textarea
              id="inputData"
              rows={10}
              {...register('inputData', { 
                required: 'Input data is required',
                minLength: { value: 10, message: 'Please provide more detailed input (at least 10 characters)' }
              })}
              className="input-field resize-none"
              placeholder={currentJobType?.placeholder}
            />
            {errors.inputData && (
              <p className="mt-1 text-sm text-red-600">{errors.inputData.message}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createJobMutation.isPending}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {createJobMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{createJobMutation.isPending ? 'Creating...' : 'Create Job'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateJob