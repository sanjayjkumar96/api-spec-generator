import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiService, Job } from '@/services/api'
import { Plus, FileText, Users, GitBranch, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const Dashboard: React.FC = () => {
  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiService.getJobs(),
    refetchInterval: (data) => {
      // Refetch every 10 seconds if there are pending jobs
      const hasPendingJobs = data?.some((job: Job) => job.status === 'PENDING')
      return hasPendingJobs ? 10000 : false
    },
    retry: 3,
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  const getJobTypeIcon = (jobType: Job['jobType']) => {
    switch (jobType) {
      case 'EARS_SPEC':
        return <FileText className="h-5 w-5" />
      case 'USER_STORY':
        return <Users className="h-5 w-5" />
      case 'INTEGRATION_PLAN':
        return <GitBranch className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getJobTypeLabel = (jobType: Job['jobType']) => {
    switch (jobType) {
      case 'EARS_SPEC':
        return 'EARS Specification'
      case 'USER_STORY':
        return 'User Story'
      case 'INTEGRATION_PLAN':
        return 'API Integration Plan'
      default:
        return jobType
    }
  }

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'PENDING':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeClasses = (status: Job['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your jobs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading jobs</h3>
        <p className="text-gray-600 mb-4">Failed to fetch your jobs. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="btn-primary flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  const completedJobs = jobs.filter(job => job.status === 'COMPLETED')
  const pendingJobs = jobs.filter(job => job.status === 'PENDING')
  const failedJobs = jobs.filter(job => job.status === 'FAILED')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your AI-generated specifications and plans</p>
        </div>
        <Link to="/create" className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create New Job</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingJobs.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{failedJobs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
          <button
            onClick={() => refetch()}
            className="btn-secondary text-sm flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
            <p className="text-gray-600 mb-4">Create your first AI-generated specification or plan</p>
            <Link to="/create" className="btn-primary">
              Create Job
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="space-y-3">
              {jobs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((job) => (
                  <Link
                    key={job.jobId}
                    to={`/jobs/${job.jobId}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 text-primary-600">
                          {getJobTypeIcon(job.jobType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {job.jobName || 'Untitled Job'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getJobTypeLabel(job.jobType)} • {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClasses(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Jobs Alert */}
      {pendingJobs.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Jobs in Progress</h3>
              <p className="text-sm text-yellow-700">
                You have {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} currently being processed. 
                They will appear here when completed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard