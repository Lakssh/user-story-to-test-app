import { useState, useEffect } from 'react'
import { generateTests, fetchJiraStory, getConfig } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraFormData, ConfigData } from './types'
import './App.css'
import logo from './assets/logo.png'
import * as XLSX from 'xlsx'

function App() {
  const CONFIG_STORAGE_KEY = 'ust-config-data'
  const [activeTab, setActiveTab] = useState<'manual' | 'jira' | 'config' | 'browser' | 'code' | 'regression' | 'defects'>('jira')
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [jiraFormData, setJiraFormData] = useState<JiraFormData>({
    storyKey: '',
    title: '',
    description: '',
    acceptanceCriteria: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [configData, setConfigData] = useState<ConfigData>({})
  const [hasLoadedConfig, setHasLoadedConfig] = useState<boolean>(false)
  const [browserUrl, setBrowserUrl] = useState<string>('https://example.com')
  const [browserInput, setBrowserInput] = useState<string>('https://example.com')
  const [navCollapsed, setNavCollapsed] = useState<boolean>(true)
  const NAV_COLLAPSED_STORAGE_KEY = 'ust-nav-collapsed'
  const ACTIVE_TAB_STORAGE_KEY = 'ust-active-tab'
  const ALL_TABS = ['jira', 'config', 'browser', 'code', 'regression', 'defects'] as const

  // Initialize navCollapsed from localStorage (if available)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY)
      if (saved !== null) {
        setNavCollapsed(saved === 'true')
      }
    } catch {}
  }, [])

  // Persist navCollapsed to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(navCollapsed))
    } catch {}
  }, [navCollapsed])

  // Initialize activeTab from localStorage (if available and valid)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
      if (savedTab && (ALL_TABS as readonly string[]).includes(savedTab)) {
        setActiveTab(savedTab as typeof ALL_TABS[number])
      }
    } catch {}
  }, [])

  // Persist activeTab to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab)
    } catch {}
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'config') {
      loadConfig()
    }
  }, [activeTab])

  const loadConfig = async () => {
    setError(null)
    try {
      // Prefer locally stored config to retain values across sessions
      const saved = typeof window !== 'undefined' ? localStorage.getItem(CONFIG_STORAGE_KEY) : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setConfigData(parsed)
      } else {
        const config = await getConfig()
        setConfigData(config)
      }
      setHasLoadedConfig(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
    }
  }

  const handleConfigChange = (field: keyof ConfigData, value: string | boolean) => {
    setConfigData(prev => ({ ...prev, [field]: value as any }))
  }

  // Persist config edits across browser sessions using localStorage
  useEffect(() => {
    if (hasLoadedConfig && typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configData))
      } catch (e) {
        // Ignore storage errors (e.g., quota)
      }
    }
  }, [configData, hasLoadedConfig])

  // Removed Save and Copy buttons; no external actions needed

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleJiraInputChange = (field: keyof JiraFormData, value: string) => {
    setJiraFormData(prev => ({ ...prev, [field]: value }))
  }

  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleClearManualForm = () => {
    setFormData({
      storyTitle: '',
      acceptanceCriteria: '',
      description: '',
      additionalInfo: ''
    })
    setError(null)
    setResults(null)
  }

  const handleClearJiraForm = () => {
    setJiraFormData({
      storyKey: '',
      title: '',
      description: '',
      acceptanceCriteria: '',
      additionalInfo: ''
    })
    setError(null)
    setResults(null)
  }

  const handleFetchJiraStory = async () => {
    // Make Story Key optional: if missing, do nothing (no error)
    if (!jiraFormData.storyKey.trim()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Include locally stored Jira credentials if available
      let storedConfig: Partial<ConfigData> = {}
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(CONFIG_STORAGE_KEY) : null
        if (saved) storedConfig = JSON.parse(saved)
      } catch {}

      const requestBody: any = { storyKey: jiraFormData.storyKey }
      const sendClientCreds = (storedConfig as any).jiraSendClientCredentials !== false
      if (sendClientCreds) {
        if (storedConfig.JIRA_URL) requestBody.jiraUrl = storedConfig.JIRA_URL
        if (storedConfig.JIRA_USERNAME) requestBody.username = storedConfig.JIRA_USERNAME
        if (storedConfig.JIRA_API_TOKEN) requestBody.apiToken = storedConfig.JIRA_API_TOKEN
      }

      const data = await fetchJiraStory(requestBody)
      setJiraFormData(prev => ({
        ...prev,
        title: data.title || '',
        description: data.description || '',
        acceptanceCriteria: data.acceptanceCriteria || ''
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Jira story')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Build request and include Groq creds if enabled
      const requestBody: any = { ...formData }
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(CONFIG_STORAGE_KEY) : null
        if (saved) {
          const storedConfig = JSON.parse(saved)
          const sendGroqCreds = storedConfig.groqSendClientCredentials !== false
          if (sendGroqCreds) {
            if (storedConfig.groq_API_KEY) requestBody.groq_API_KEY = storedConfig.groq_API_KEY
            if (storedConfig.groq_API_BASE) requestBody.groq_API_BASE = storedConfig.groq_API_BASE
            if (storedConfig.groq_MODEL) requestBody.groq_MODEL = storedConfig.groq_MODEL
          }
        }
      } catch {}

      const response = await generateTests(requestBody)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJiraSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!jiraFormData.title.trim() || !jiraFormData.acceptanceCriteria.trim()) {
      setError('Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const request: any = {
        storyTitle: jiraFormData.title,
        acceptanceCriteria: jiraFormData.acceptanceCriteria,
        description: jiraFormData.description,
        additionalInfo: jiraFormData.additionalInfo
      }
      // Include Groq creds if enabled
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(CONFIG_STORAGE_KEY) : null
        if (saved) {
          const storedConfig = JSON.parse(saved)
          const sendGroqCreds = storedConfig.groqSendClientCredentials !== false
          if (sendGroqCreds) {
            if (storedConfig.groq_API_KEY) request.groq_API_KEY = storedConfig.groq_API_KEY
            if (storedConfig.groq_API_BASE) request.groq_API_BASE = storedConfig.groq_API_BASE
            if (storedConfig.groq_MODEL) request.groq_MODEL = storedConfig.groq_MODEL
          }
        }
      } catch {}
      const response = await generateTests(request)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!results || !results.cases || results.cases.length === 0) {
      return
    }

    // Prepare data for Excel
    const excelData = results.cases.flatMap((testCase: TestCase) => {
      return testCase.steps.map((step, stepIndex) => ({
        'Test Case ID': testCase.id,
        'Title': testCase.title,
        'Category': testCase.category,
        'Step Number': stepIndex + 1,
        'Step Description': step,
        'Test Data': testCase.testData || 'N/A',
        'Expected Result': stepIndex === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'
      }))
    })

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Test Case ID
      { wch: 40 }, // Title
      { wch: 15 }, // Category
      { wch: 12 }, // Step Number
      { wch: 50 }, // Step Description
      { wch: 30 }, // Test Data
      { wch: 40 }  // Expected Result
    ]

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `test-cases-${timestamp}.xlsx`

    // Download file
    XLSX.writeFile(workbook, filename)
  }

  return (
    <div>
      <div className="container">
        <div className="header">
          <div className="logo">
            <img src={logo} alt="User Story to Tests Logo" />
          </div>
          <div className="header-content">
            <h1 className="title">QA360 Assistant</h1>
            <p className="subtitle">Generate comprehensive test cases from your user stories</p>
          </div>
        </div>
        
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
        
        {/* Left-hand navigation layout */}
        <div className={`app-layout ${navCollapsed ? 'collapsed' : ''}`}>
          <aside className={`side-nav ${navCollapsed ? 'collapsed' : ''}`}>
            <div className="side-nav-inner">
              <button
                type="button"
                className="collapse-toggle"
                onClick={() => setNavCollapsed(v => !v)}
                aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="collapse-icon" aria-hidden="true">
                  {navCollapsed ? (
                    // Chevron Right SVG (expand)
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  ) : (
                    // Chevron Left SVG (collapse)
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">
                      <polyline points="15 6 9 12 15 18" />
                    </svg>
                  )}
                </span>
              </button>
            {/* Manual tab hidden for now; retained for future use */}
            <button
              className={`nav-button ${activeTab === 'jira' ? 'active' : ''}`}
              onClick={() => setActiveTab('jira')}
              aria-label="TC Generation"
              title="TC Generation"
            >
              <span className="nav-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-hidden="true"
                  focusable="false"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Code window with pencil - represents Test Case authoring */}
                  <rect x="3" y="4" width="14" height="12" rx="2" />
                  <line x1="5" y1="7" x2="7" y2="7" />
                  <line x1="8" y1="7" x2="10" y2="7" />
                  {/* code chevrons */}
                  <polyline points="9 10 7 12 9 14" />
                  <polyline points="13 10 15 12 13 14" />
                  {/* pencil overlay at bottom-right */}
                  <line x1="15" y1="14" x2="20" y2="19" />
                  <line x1="20" y1="19" x2="21" y2="18" />
                  <line x1="14" y1="15" x2="15" y2="14" />
                </svg>
              </span>
              <span className="nav-text">TC Generation</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
              aria-label="Code review"
              title="Code Review"
            >
              <span className="nav-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-hidden="true"
                  focusable="false"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="14" height="12" rx="2" />
                  <line x1="6" y1="8" x2="11" y2="8" />
                  <line x1="6" y1="11" x2="13" y2="11" />
                  <line x1="6" y1="14" x2="11.5" y2="14" />
                  <circle cx="17" cy="17" r="3.5" />
                  <line x1="19.5" y1="19.5" x2="22" y2="22" />
                </svg>
              </span>
              <span className="nav-text">Code Review</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'regression' ? 'active' : ''}`}
              onClick={() => setActiveTab('regression')}
              aria-label="Regression impact analyser"
              title="Regression Impact Analyser"
            >
              <span className="nav-icon">🧪</span>
              <span className="nav-text">Regression Impact Analyser</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'defects' ? 'active' : ''}`}
              onClick={() => setActiveTab('defects')}
              aria-label="Defect prediction"
              title="Defect Prediction"
            >
              <span className="nav-icon">🐞</span>
              <span className="nav-text">Defect Prediction</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
              aria-label="Configuration"
              title="Configuration"
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Configuration</span>
            </button>
            <button
              className={`nav-button ${activeTab === 'browser' ? 'active' : ''}`}
              onClick={() => setActiveTab('browser')}
              aria-label="HTML browser"
              title="HTML Browser"
            >
              <span className="nav-icon">🌐</span>
              <span className="nav-text">HTML Browser</span>
            </button>
            </div>
          </aside>
          <section className="main-panel">
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} className="tab-content">
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>
          
            <div className="button-group">
              <button
                type="submit"
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
              <button
                type="button"
                className="clear-btn"
                onClick={handleClearManualForm}
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          </form>
        )}
        
        {activeTab === 'jira' && (
          <div className="tab-content">
            <form onSubmit={handleJiraSubmit}>
              <div className="jira-two-column-layout">
                {/* Left Column */}
                <div className="jira-column jira-column-left">
                  <div className="form-group">
                    <label htmlFor="storyKey" className="form-label">
                      Story Key
                    </label>
                    <div className="story-key-container">
                      <input
                        type="text"
                        id="storyKey"
                        className="form-input story-key-input"
                        value={jiraFormData.storyKey}
                        onChange={(e) => handleJiraInputChange('storyKey', e.target.value)}
                        placeholder="Enter Jira story key (e.g., PROJ-123)..."
                      />
                      <button
                        type="button"
                        className="fetch-button"
                        onClick={handleFetchJiraStory}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Fetching...' : 'Fetch'}
                      </button>
                    </div>
                    <small className="field-help hint-optional">Optional - Enter Story Key and fetch the details automatically from Jira</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraDescription" className="form-label">
                      Description
                    </label>
                    <textarea
                      id="jiraDescription"
                      className="form-textarea jira-textarea-description"
                      value={jiraFormData.description}
                      onChange={(e) => handleJiraInputChange('description', e.target.value)}
                      placeholder="Story description will be populated from Jira..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraAdditionalInfo" className="form-label">
                      Additional Inputs
                    </label>
                    <textarea
                      id="jiraAdditionalInfo"
                      className="form-textarea jira-textarea-additional"
                      value={jiraFormData.additionalInfo}
                      onChange={(e) => handleJiraInputChange('additionalInfo', e.target.value)}
                      placeholder="Any additional information or context..."
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="jira-column jira-column-right">
                  <div className="form-group">
                    <label htmlFor="jiraTitle" className="form-label">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="jiraTitle"
                      className="form-input"
                      value={jiraFormData.title}
                      onChange={(e) => handleJiraInputChange('title', e.target.value)}
                      placeholder="Story title will be populated from Jira..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraAcceptanceCriteria" className="form-label">
                      Acceptance Criteria *
                    </label>
                    <textarea
                      id="jiraAcceptanceCriteria"
                      className="form-textarea jira-textarea-acceptance"
                      value={jiraFormData.acceptanceCriteria}
                      onChange={(e) => handleJiraInputChange('acceptanceCriteria', e.target.value)}
                      placeholder="Acceptance criteria will be populated from Jira..."
                      required
                    />
                  </div>

                  <div className="button-group jira-button-group">
                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={isLoading || !jiraFormData.title || !jiraFormData.acceptanceCriteria}
                    >
                      {isLoading ? 'Generating...' : 'Generate Test Cases'}
                    </button>
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={handleClearJiraForm}
                      disabled={isLoading}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="tab-content">
            <h3 className="config-section-title" style={{ marginBottom: 16 }}>
              <span className="config-icon">🧩</span> Code Review
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="codeReviewInput">Paste code or diff</label>
              <div className="field-wrapper">
                <textarea id="codeReviewInput" className="form-textarea" placeholder="Paste your code snippet or git diff here to review..." style={{ minHeight: 200 }} />
                <small className="field-help">Tip: You can copy a unified diff (git diff) or a single file’s content.</small>
              </div>
            </div>
            <div className="success-banner" style={{ marginTop: 10 }}>
              Analysis coming soon. This section will highlight issues, smells, and suggestions with severity and quick fixes.
            </div>
          </div>
        )}
        
        {activeTab === 'regression' && (
          <div className="tab-content">
            <h3 className="config-section-title" style={{ marginBottom: 16 }}>
              <span className="config-icon">🧪</span> Regression Impact Analyser
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="regressionFiles">Changed files / areas</label>
              <div className="field-wrapper">
                <textarea id="regressionFiles" className="form-textarea" placeholder="List changed files or modules (one per line)..." style={{ minHeight: 160 }} />
                <small className="field-help">Example: src/components/Button.tsx, backend/src/services/userService.ts</small>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="regressionNotes">Notes (optional)</label>
              <div className="field-wrapper">
                <textarea id="regressionNotes" className="form-textarea" placeholder="Add context like feature area, risky dependencies, or recent incidents..." style={{ minHeight: 120 }} />
              </div>
            </div>
            <div className="success-banner" style={{ marginTop: 10 }}>
              Impact analysis coming soon. You’ll see affected components, recommended regression suites, and risk scoring.
            </div>
          </div>
        )}

        {activeTab === 'defects' && (
          <div className="tab-content">
            <h3 className="config-section-title" style={{ marginBottom: 16 }}>
              <span className="config-icon">🐞</span> Defect Prediction
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="defectDesc">Commit/PR description</label>
              <div className="field-wrapper">
                <textarea id="defectDesc" className="form-textarea" placeholder="Describe the change, scope, and key behaviors..." style={{ minHeight: 140 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="defectComponents">Components touched</label>
              <div className="field-wrapper">
                <input id="defectComponents" type="text" className="form-input" placeholder="e.g., Auth, Checkout, Payments" />
              </div>
            </div>
            <div className="success-banner" style={{ marginTop: 10 }}>
              Prediction coming soon. This will estimate defect likelihood, areas of concern, and suggest additional tests.
            </div>
          </div>
        )}

        {activeTab === 'browser' && (
          <div className="tab-content">
            <div className="browser-container">
              <div className="browser-controls">
                <input
                  type="text"
                  className="form-input browser-input"
                  value={browserInput}
                  onChange={(e) => setBrowserInput(e.target.value)}
                  placeholder="Enter a URL, e.g. https://example.com"
                />
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => {
                    const url = normalizeUrl(browserInput)
                    if (url) setBrowserUrl(url)
                  }}
                >
                  Open
                </button>
              </div>
              <div className="field-help" style={{ marginBottom: '10px' }}>
                Note: Some sites may block embedding in an iframe (X-Frame-Options / CSP).
              </div>
              <div className="browser-iframe-wrapper">
                <iframe
                  key={browserUrl}
                  src={browserUrl}
                  title="HTML Browser"
                  className="browser-iframe"
                  sandbox="allow-forms allow-scripts allow-popups allow-top-navigation-by-user-activation"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="tab-content">
            <div className="config-container">
              <div className="config-two-column-layout">
                {/* Left Column - Groq API Configuration */}
                <div className="config-column config-column-left">
                  <h3 className="config-section-title">
                    <span className="config-icon">🤖</span> Groq API Configuration
                  </h3>
                  
                  <div className="form-group">
                    <label htmlFor="groq_API_BASE" className="form-label">
                      API Base URL
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="text"
                        id="groq_API_BASE"
                        className="form-input"
                        value={configData.groq_API_BASE || ''}
                        onChange={(e) => handleConfigChange('groq_API_BASE', e.target.value)}
                        placeholder="https://api.groq.com/openai/v1"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="groq_API_KEY" className="form-label">
                      API Key *
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="password"
                        id="groq_API_KEY"
                        className="form-input"
                        value={configData.groq_API_KEY || ''}
                        onChange={(e) => handleConfigChange('groq_API_KEY', e.target.value)}
                        placeholder="Enter your Groq API key..."
                      />
                      <small className="field-help">Get your API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console</a></small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="groq_MODEL" className="form-label">
                      Model
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="text"
                        id="groq_MODEL"
                        className="form-input"
                        value={configData.groq_MODEL || ''}
                        onChange={(e) => handleConfigChange('groq_MODEL', e.target.value)}
                        placeholder="openai/gpt-oss-120b"
                      />
                      <small className="field-help">Specify the Groq model to use for test generation</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Client override</label>
                    <div className="field-wrapper">
                      <label className="checkbox-label" htmlFor="groqSendClientCredentials">
                        <input
                          id="groqSendClientCredentials"
                          type="checkbox"
                          checked={configData.groqSendClientCredentials !== false}
                          onChange={(e) => handleConfigChange('groqSendClientCredentials', e.target.checked)}
                        />
                        <span>Send Groq credentials from browser (override server env)</span>
                      </label>
                      <small className="field-help">
                        When enabled, your Groq API key, base URL, and model set above will be sent with the generate request. Disable to rely on server environment variables.
                      </small>
                    </div>
                  </div>
                </div>

                {/* Right Column - Jira Configuration */}
                <div className="config-column config-column-right">
                  <h3 className="config-section-title">
                    <span className="config-icon">📋</span> Jira Configuration
                  </h3>
                  
                  <div className="form-group">
                    <label htmlFor="JIRA_URL" className="form-label">
                      Jira URL
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="text"
                        id="JIRA_URL"
                        className="form-input"
                        value={configData.JIRA_URL || ''}
                        onChange={(e) => handleConfigChange('JIRA_URL', e.target.value)}
                        placeholder="https://your-domain.atlassian.net/"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="JIRA_USERNAME" className="form-label">
                      Username (Email)
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="email"
                        id="JIRA_USERNAME"
                        className="form-input"
                        value={configData.JIRA_USERNAME || ''}
                        onChange={(e) => handleConfigChange('JIRA_USERNAME', e.target.value)}
                        placeholder="your-email@example.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="JIRA_API_TOKEN" className="form-label">
                      API Token *
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="password"
                        id="JIRA_API_TOKEN"
                        className="form-input"
                        value={configData.JIRA_API_TOKEN || ''}
                        onChange={(e) => handleConfigChange('JIRA_API_TOKEN', e.target.value)}
                        placeholder="Enter your Jira API token..."
                      />
                      <small className="field-help">Generate token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">Atlassian API Tokens</a></small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="JIRA_ACCEPTANCE_CRITERIA_FIELD" className="form-label">
                      Acceptance Criteria Field
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="text"
                        id="JIRA_ACCEPTANCE_CRITERIA_FIELD"
                        className="form-input"
                        value={configData.JIRA_ACCEPTANCE_CRITERIA_FIELD || ''}
                        onChange={(e) => handleConfigChange('JIRA_ACCEPTANCE_CRITERIA_FIELD', e.target.value)}
                        placeholder="customfield_10000"
                      />
                      <small className="field-help">Custom field ID for acceptance criteria</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="JIRA_STORY_POINTS_FIELD" className="form-label">
                      Story Points Field
                    </label>
                    <div className="field-wrapper">
                      <input
                        type="text"
                        id="JIRA_STORY_POINTS_FIELD"
                        className="form-input"
                        value={configData.JIRA_STORY_POINTS_FIELD || ''}
                        onChange={(e) => handleConfigChange('JIRA_STORY_POINTS_FIELD', e.target.value)}
                        placeholder="customfield_10002"
                      />
                      <small className="field-help">Custom field ID for story points</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Client override</label>
                    <div className="field-wrapper">
                      <label className="checkbox-label" htmlFor="jiraSendClientCredentials">
                        <input
                          id="jiraSendClientCredentials"
                          type="checkbox"
                          checked={configData.jiraSendClientCredentials !== false}
                          onChange={(e) => handleConfigChange('jiraSendClientCredentials', e.target.checked)}
                        />
                        <span>Send Jira credentials from browser (override server env)</span>
                      </label>
                      <small className="field-help">
                        When enabled, your Jira URL, username, and API token from this page are sent with each Jira request. Disable to rely on server environment variables.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button group removed as per request: retain inputs only, no actions */}
            </div>
          </div>
        )}

          </section>
        </div>

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <div className="results-header-left">
                <h2 className="results-title">Generated Test Cases</h2>
                <div className="results-meta">
                  {results.cases.length} test case(s) generated
                  {results.model && ` • Model: ${results.model}`}
                  {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
                </div>
              </div>
              <button 
                className="export-button"
                onClick={exportToExcel}
                title="Export to Excel"
              >
                Export to Excel
              </button>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App