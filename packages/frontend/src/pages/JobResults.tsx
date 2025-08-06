import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import mermaid from 'mermaid'
import { apiService, Job } from '@/services/api'
import { 
  ArrowLeft, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock,
  FileText,
  Code,
  Eye,
  EyeOff,
  RefreshCw,
  Layers,
  Shield,
  TestTube,
  Workflow,
  Monitor,
  Zap,
  AlertTriangle,
  BookOpen,
  Database
} from 'lucide-react'

const JobResults: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: job, isLoading, error, refetch } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => {
      if (!jobId) throw new Error('Job ID is required')
      return apiService.getJob(jobId)
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      return data?.status === 'PENDING' ? 5000 : false
    },
    retry: (failureCount, error) => {
      // Retry up to 3 times, but not for 404 errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return false
      }
      return failureCount < 3
    }
  })

  // Helper function to check if a field has meaningful content
  const hasContent = (content: string | undefined | null): boolean => {
    if (!content) return false
    const trimmed = content.trim()
    return trimmed.length > 0 && 
           !trimmed.match(/^No .+ (found|available)$/i) &&
           trimmed !== '""' &&
           trimmed !== "''"
  }

  // Check if job is an Integration Plan type
  const isIntegrationPlan = job?.jobType === 'INTEGRATION_PLAN'

  // Get structured data from the job output
  const getStructuredData = () => {
    if (!job?.output) return null

    // Filter code templates to only include those with meaningful content
    const filteredCodeTemplates = (job.output.codeTemplates || []).filter((template: any) => 
      template && template.content && template.content.trim().length > 0
    )

    // Filter diagrams to only include those with meaningful content
    const filteredDiagrams = (job.output.diagrams || []).filter((diagram: any) => 
      diagram && diagram.content && diagram.content.trim().length > 0
    )

    // Filter sections to only include those with meaningful content
    const filteredSections = (job.output.sections || []).filter((section: any) => 
      section && section.content && hasContent(section.content)
    )

    // Handle project structure - could be string or array
    let projectStructureContent = null
    if (job.output.projectStructure) {
      if (typeof job.output.projectStructure === 'string') {
        projectStructureContent = hasContent(job.output.projectStructure) ? job.output.projectStructure : null
      } else if (Array.isArray(job.output.projectStructure)) {
        // Convert array to string representation
        const structureText = job.output.projectStructure
          .map((item: any) => `${item.type === 'directory' ? '📁' : '📄'} ${item.path}${item.description ? ` - ${item.description}` : ''}`)
          .join('\n')
        projectStructureContent = hasContent(structureText) ? structureText : null
      }
    }

    return {
      // Use filtered structured data
      sections: filteredSections,
      diagrams: filteredDiagrams,
      codeTemplates: filteredCodeTemplates,
      
      // Direct fields from the output - only include if they have content
      executiveSummary: hasContent(job.output.executiveSummary) ? job.output.executiveSummary : null,
      security: hasContent(job.output.security) ? job.output.security : null,
      errorHandling: hasContent(job.output.errorHandling) ? job.output.errorHandling : null,
      testing: hasContent(job.output.testing) ? job.output.testing : null,
      deployment: hasContent(job.output.deployment) ? job.output.deployment : null,
      monitoring: hasContent(job.output.monitoring) ? job.output.monitoring : null,
      performance: hasContent(job.output.performance) ? job.output.performance : null,
      risks: hasContent(job.output.risks) ? job.output.risks : null,
      projectStructure: projectStructureContent,
      
      // Main content sources - prioritize consolidatedContent
      mainContent: hasContent(job.output.consolidatedContent) ? job.output.consolidatedContent : 
                   hasContent(job.output.integrationPlan) ? job.output.integrationPlan : 
                   hasContent(job.output.content) ? job.output.content : null
    }
  }

  const structuredData = isIntegrationPlan ? getStructuredData() : null

  // Initialize section visibility based on content availability
  const getInitialVisibility = () => {
    const defaultVisibility = {
      executiveSummary: true,
      architecture: true,
      apiSpecs: true,
      security: true,
      errorHandling: true,
      testing: true,
      deployment: true,
      monitoring: true,
      performance: true,
      risks: true,
      implementation: true,
      diagrams: true,
      codeTemplates: true,
      projectStructure: true,
      content: true
    }

    if (!structuredData) return defaultVisibility

    // Set visibility based on content availability
    return {
      ...defaultVisibility,
      executiveSummary: !!structuredData.executiveSummary,
      security: !!structuredData.security,
      errorHandling: !!structuredData.errorHandling,
      testing: !!structuredData.testing,
      deployment: !!structuredData.deployment,
      monitoring: !!structuredData.monitoring,
      performance: !!structuredData.performance,
      risks: !!structuredData.risks,
      projectStructure: !!structuredData.projectStructure,
      diagrams: structuredData.diagrams.length > 0,
      codeTemplates: structuredData.codeTemplates.length > 0,
      content: !!structuredData.mainContent
    }
  }

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(() => getInitialVisibility())

  // Update visibility when job data changes
  useEffect(() => {
    setVisibleSections(getInitialVisibility())
  }, [job?.output])

  // Initialize Mermaid with better configuration
  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35
      }
    })
  }, [])

  // Enhanced Mermaid diagram rendering for structured data
  const renderMermaidDiagram = async (definition: string, elementId: string) => {
    try {
      const element = document.getElementById(elementId)
      if (element && definition.trim()) {
        // Clear previous content
        element.innerHTML = ''
        
        // Check if it's a valid mermaid diagram
        if (definition.includes('graph') || definition.includes('sequenceDiagram') || 
            definition.includes('classDiagram') || definition.includes('flowchart') ||
            definition.includes('gantt') || definition.includes('gitgraph') ||
            definition.includes('erDiagram') || definition.includes('journey') ||
            definition.includes('pie') || definition.includes('state') ||
            definition.includes('C4Context') || definition.includes('mindmap')) {
          try {
            const { svg } = await mermaid.render(`mermaid-${elementId}`, definition)
            element.innerHTML = svg
          } catch (renderError) {
            console.warn('Mermaid rendering failed, showing as code:', renderError)
            element.innerHTML = `<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code>${definition}</code></pre>`
          }
        } else {
          // If not a mermaid diagram, show as code block
          element.innerHTML = `<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code>${definition}</code></pre>`
        }
      }
    } catch (error) {
      console.warn('Mermaid rendering error:', error)
      // Fallback to showing raw content
      const element = document.getElementById(elementId)
      if (element) {
        element.innerHTML = `<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code>${definition}</code></pre>`
      }
    }
  }

  // Re-render diagrams when job data changes - handle structured diagrams properly
  useEffect(() => {
    if (job?.output?.diagrams && Array.isArray(job.output.diagrams) && activeTab === 'diagrams') {
      setTimeout(() => {
        job.output!.diagrams!.forEach((diagram, index) => {
          if (diagram.content && diagram.type === 'mermaid') {
            renderMermaidDiagram(diagram.content, `diagram-${diagram.id || index}`)
          }
        })
      }, 100)
    }
  }, [job?.output?.diagrams, activeTab])

  // Re-render diagrams when visibility changes or tab switches
  useEffect(() => {
    if (activeTab === 'diagrams' && structuredData?.diagrams) {
      // Small delay to ensure DOM elements are ready
      const timer = setTimeout(() => {
        structuredData.diagrams.forEach((diagram, index) => {
          if (diagram.content && diagram.type === 'mermaid') {
            const elementId = `diagram-${diagram.id || index}`
            const element = document.getElementById(elementId)
            if (element && !element.innerHTML.trim()) {
              renderMermaidDiagram(diagram.content, elementId)
            }
          }
        })
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [activeTab, structuredData])

  // Copy to clipboard handler
  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Toggle section visibility
  const toggleSection = (section: string) => {
    setVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get job type label
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

  // Get status icon
  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'PENDING':
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  // Get status badge classes
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

  // Get error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // Check if error is a not found error
  const isNotFoundError = (error: unknown): boolean => {
    const errorMessage = getErrorMessage(error)
    return errorMessage.includes('not found') || errorMessage.includes('404')
  }

  // Enhanced section component for structured content
  const StructuredSectionCard: React.FC<{
    title: string
    icon: React.ReactNode
    content: string
    sectionKey: string
    language?: string
  }> = ({ title, icon, content, sectionKey, language = 'markdown' }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={visibleSections[sectionKey] ? 'Hide section' : 'Show section'}
          >
            {visibleSections[sectionKey] ? (
              <EyeOff className="h-4 w-4 text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => handleCopy(content, sectionKey)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {copiedSection === sectionKey ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copiedSection === sectionKey ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {visibleSections[sectionKey] && (
        <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                const detectedLanguage = match ? match[1] : language
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as any}
                    language={detectedLanguage}
                    PreTag="div"
                    showLineNumbers={!['mermaid', 'text', 'bash'].includes(detectedLanguage)}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={`${className} bg-gray-200 px-1 py-0.5 rounded text-sm`} {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )

  // Diagram rendering component for structured diagrams
  const DiagramCard: React.FC<{
    diagram: any
    index: number
  }> = ({ diagram, index }) => {
    const diagramRef = React.useRef<HTMLDivElement>(null)
    
    // Use intersection observer to render diagram when it comes into view
    React.useEffect(() => {
      const element = diagramRef.current
      if (!element || diagram.type !== 'mermaid') return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !element.innerHTML.trim()) {
              setTimeout(() => {
                renderMermaidDiagram(diagram.content, `diagram-${diagram.id || index}`)
              }, 100)
            }
          })
        },
        { threshold: 0.1 }
      )

      observer.observe(element)
      return () => observer.disconnect()
    }, [diagram, index])

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">{diagram.title}</h3>
            {diagram.category && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {diagram.category}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(diagram.content, `diagram-${diagram.id || index}`)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copiedSection === `diagram-${diagram.id || index}` ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{copiedSection === `diagram-${diagram.id || index}` ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          {diagram.type === 'mermaid' ? (
            <div 
              ref={diagramRef}
              id={`diagram-${diagram.id || index}`}
              className="mermaid-container bg-white p-4 rounded border min-h-[200px] flex items-center justify-center"
            >
              <span className="text-gray-500 text-sm">Loading diagram...</span>
            </div>
          ) : (
            <pre className="bg-white p-4 rounded border overflow-x-auto">
              <code>{diagram.content}</code>
            </pre>
          )}
        </div>
      </div>
    )
  }

  // Code template component for structured code templates
  const CodeTemplateCard: React.FC<{
    template: any
    index: number
  }> = ({ template, index }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">{template.title || `Code Template ${index + 1}`}</h3>
          {template.language && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              {template.language}
            </span>
          )}
          {template.category && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {template.category}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopy(template.content, `code-${template.id || index}`)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {copiedSection === `code-${template.id || index}` ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copiedSection === `code-${template.id || index}` ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <SyntaxHighlighter
          style={tomorrow as any}
          language={template.language || 'text'}
          PreTag="div"
          showLineNumbers={template.language && !['bash', 'shell', 'json'].includes(template.language)}
        >
          {template.content}
        </SyntaxHighlighter>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    const errorMessage = error ? getErrorMessage(error) : 'Unknown error'
    const isNotFound = error ? isNotFoundError(error) : false

    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isNotFound ? 'Job not found' : 'Error loading job'}
        </h3>
        <p className="text-gray-600 mb-4">
          {isNotFound 
            ? 'The requested job could not be found. It may have been deleted or you may not have access to it.'
            : `There was an error loading the job details: ${errorMessage}`
          }
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
          {!isNotFound && (
            <button
              onClick={() => refetch()}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.jobName || 'Untitled Job'}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{getJobTypeLabel(job.jobType)}</span>
              <span>•</span>
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              {job.updatedAt && job.updatedAt !== job.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(job.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusIcon(job.status)}
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusBadgeClasses(job.status)}`}>
            {job.status}
          </span>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh job status"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Job Status Messages */}
      {job.status === 'PENDING' && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <div>
              <h3 className="font-medium text-gray-900">Processing your request...</h3>
              <p className="text-sm text-gray-600">
                {isIntegrationPlan 
                  ? 'Generating comprehensive integration plan with diagrams, code templates, and project structure. This usually takes 3-7 minutes.'
                  : 'This usually takes 2-5 minutes. The page will update automatically.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {job.status === 'FAILED' && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-medium text-gray-900">Job Failed</h3>
              <p className="text-sm text-gray-600">
                {job.errorMessage || 'There was an error processing your request. Please try creating a new job.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {job.status === 'COMPLETED' && job.output && (
        <div className="space-y-6">
          {/* Integration Plan Content */}
          {isIntegrationPlan && structuredData && (
            <>
              {/* Enhanced Tab Navigation */}
              <div className="card">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === 'overview'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Integration Plan</span>
                      </div>
                    </button>
                    
                    {structuredData.diagrams.length > 0 && (
                      <button
                        onClick={() => setActiveTab('diagrams')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === 'diagrams'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Layers className="h-4 w-4" />
                          <span>Architecture Diagrams ({structuredData.diagrams.length})</span>
                        </div>
                      </button>
                    )}
                    
                    {structuredData.codeTemplates.length > 0 && (
                      <button
                        onClick={() => setActiveTab('code')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === 'code'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4" />
                          <span>Code Templates ({structuredData.codeTemplates.length})</span>
                        </div>
                      </button>
                    )}
                    
                    {structuredData.mainContent && (
                      <button
                        onClick={() => setActiveTab('full')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === 'full'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Complete Document</span>
                        </div>
                      </button>
                    )}
                  </nav>
                </div>

                {/* Enhanced Tab Content */}
                <div className="py-6">
                  {/* Integration Plan Tab - Show structured sections or individual fields */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Use structured sections if available */}
                      {structuredData.sections.length > 0 ? (
                        structuredData.sections.map((section, index) => (
                          <StructuredSectionCard
                            key={section.id || index}
                            title={section.title}
                            icon={<BookOpen className="h-5 w-5 text-primary-600" />}
                            content={section.content}
                            sectionKey={`section-${section.id || index}`}
                          />
                        ))
                      ) : (
                        <>
                          {/* Fallback to individual fields */}
                          {structuredData.executiveSummary && (
                            <StructuredSectionCard
                              title="Executive Summary and Integration Overview"
                              icon={<BookOpen className="h-5 w-5 text-primary-600" />}
                              content={structuredData.executiveSummary}
                              sectionKey="executiveSummary"
                            />
                          )}

                          {structuredData.security && (
                            <StructuredSectionCard
                              title="Security Architecture and Authentication"
                              icon={<Shield className="h-5 w-5 text-primary-600" />}
                              content={structuredData.security}
                              sectionKey="security"
                            />
                          )}

                          {structuredData.errorHandling && (
                            <StructuredSectionCard
                              title="Error Handling and Resilience Patterns"
                              icon={<AlertTriangle className="h-5 w-5 text-primary-600" />}
                              content={structuredData.errorHandling}
                              sectionKey="errorHandling"
                            />
                          )}

                          {structuredData.testing && (
                            <StructuredSectionCard
                              title="Testing Strategy and Quality Assurance"
                              icon={<TestTube className="h-5 w-5 text-primary-600" />}
                              content={structuredData.testing}
                              sectionKey="testing"
                            />
                          )}

                          {structuredData.deployment && (
                            <StructuredSectionCard
                              title="Deployment and Operations Guide"
                              icon={<Workflow className="h-5 w-5 text-primary-600" />}
                              content={structuredData.deployment}
                              sectionKey="deployment"
                            />
                          )}

                          {structuredData.monitoring && (
                            <StructuredSectionCard
                              title="Monitoring and Observability"
                              icon={<Monitor className="h-5 w-5 text-primary-600" />}
                              content={structuredData.monitoring}
                              sectionKey="monitoring"
                            />
                          )}

                          {structuredData.performance && (
                            <StructuredSectionCard
                              title="Performance and Scalability Considerations"
                              icon={<Zap className="h-5 w-5 text-primary-600" />}
                              content={structuredData.performance}
                              sectionKey="performance"
                            />
                          )}

                          {structuredData.risks && (
                            <StructuredSectionCard
                              title="Risk Assessment and Mitigation"
                              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                              content={structuredData.risks}
                              sectionKey="risks"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Architecture Diagrams Tab - Show structured diagrams */}
                  {activeTab === 'diagrams' && (
                    <div className="space-y-6">
                      {structuredData.diagrams.map((diagram, index) => (
                        <DiagramCard
                          key={diagram.id || index}
                          diagram={diagram}
                          index={index}
                        />
                      ))}
                    </div>
                  )}

                  {/* Code Templates Tab - Show structured code templates */}
                  {activeTab === 'code' && (
                    <div className="space-y-6">
                      {structuredData.codeTemplates.map((template, index) => (
                        <CodeTemplateCard
                          key={template.id || index}
                          template={template}
                          index={index}
                        />
                      ))}
                    </div>
                  )}

                  {/* Complete Document Tab */}
                  {activeTab === 'full' && structuredData.mainContent && (
                    <div className="space-y-6">
                      <StructuredSectionCard
                        title="Complete Integration Plan Document"
                        icon={<FileText className="h-5 w-5 text-primary-600" />}
                        content={structuredData.mainContent}
                        sectionKey="fullContent"
                      />
                    </div>
                  )}

                  {/* Empty state messages */}
                  {activeTab === 'diagrams' && structuredData.diagrams.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Architecture Diagrams</h3>
                      <p>No architecture diagrams were generated for this integration plan.</p>
                    </div>
                  )}

                  {activeTab === 'code' && structuredData.codeTemplates.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Templates</h3>
                      <p>No code templates were generated for this integration plan.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Non-Integration Plan Content (EARS_SPEC, USER_STORY) */}
          {!isIntegrationPlan && job.output.content && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-900">{getJobTypeLabel(job.jobType)} Content</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleSection('content')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {visibleSections.content ? (
                      <EyeOff className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleCopy(job.output!.content!, 'content')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copiedSection === 'content' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>{copiedSection === 'content' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              {visibleSections.content && (
                <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={tomorrow as any}
                            language={match[1]}
                            PreTag="div"
                            showLineNumbers
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={`${className} bg-gray-200 px-1 py-0.5 rounded text-sm`} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {job.output.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Legacy support for files and metadata */}
          {job.output.files && job.output.files.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Generated Files</h2>
              </div>
              <div className="space-y-2">
                {job.output.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{file}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(file, `file-${index}`)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      {copiedSection === `file-${index}` ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedSection === `file-${index}` ? 'Copied!' : 'Copy Path'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata - Only show if there's meaningful metadata */}
          {job.output.metadata && (job.output.metadata.modelId || job.output.metadata.timestamp || job.output.metadata.mockMode) && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Generation Details</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {job.output.metadata.modelId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium text-gray-900">{job.output.metadata.modelId}</span>
                  </div>
                )}
                {job.output.metadata.timestamp && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Generated:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(job.output.metadata.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
                {job.output.metadata.mockMode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mode:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Development Mock
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results Message */}
      {job.status === 'COMPLETED' && !job.output && (
        <div className="card">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
            <p className="text-gray-600">The job completed but no output was generated. Please try creating a new job.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobResults