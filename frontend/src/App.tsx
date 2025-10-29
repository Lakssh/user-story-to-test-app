import { useState, useEffect } from 'react'
import { generateTests, fetchJiraStory, getConfig, updateConfig } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraFormData, ConfigData } from './types'
import './App.css'
import logo from './assets/logo.png'
import * as XLSX from 'xlsx'

function App() {
  const [activeTab, setActiveTab] = useState<'manual' | 'jira' | 'config'>('manual')
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
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(false)
  const [configSuccess, setConfigSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'config') {
      loadConfig()
    }
  }, [activeTab])

  const loadConfig = async () => {
    setIsConfigLoading(true)
    setError(null)
    try {
      const config = await getConfig()
      setConfigData(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setIsConfigLoading(false)
    }
  }

  const handleConfigChange = (field: keyof ConfigData, value: string) => {
    setConfigData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveConfig = async () => {
    setIsConfigLoading(true)
    setError(null)
    setConfigSuccess(null)
    try {
      console.log('Saving config:', configData)
      await updateConfig(configData)
      setConfigSuccess('Configuration saved successfully!')
      setTimeout(() => setConfigSuccess(null), 3000)
    } catch (err) {
      console.error('Config save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsConfigLoading(false)
    }
  }

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
    if (!jiraFormData.storyKey.trim()) {
      setError('Please enter a Jira story key')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchJiraStory({ storyKey: jiraFormData.storyKey })
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
      const response = await generateTests(formData)
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
      const request: GenerateRequest = {
        storyTitle: jiraFormData.title,
        acceptanceCriteria: jiraFormData.acceptanceCriteria,
        description: jiraFormData.description,
        additionalInfo: jiraFormData.additionalInfo
      }
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
            <h1 className="title">User Story to Tests</h1>
            <p className="subtitle">Generate comprehensive test cases from your user stories</p>
          </div>
        </div>
        
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
        
        {configSuccess && (
          <div className="success-banner">
            {configSuccess}
          </div>
        )}
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Input
          </button>
          <button 
            className={`tab-button ${activeTab === 'jira' ? 'active' : ''}`}
            onClick={() => setActiveTab('jira')}
          >
            Jira Integration
          </button>
          <button 
            className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
        </div>
        
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
                      <span className="label-icon">🔑</span> Story Key *
                    </label>
                    <div className="story-key-container">
                      <input
                        type="text"
                        id="storyKey"
                        className="form-input story-key-input"
                        value={jiraFormData.storyKey}
                        onChange={(e) => handleJiraInputChange('storyKey', e.target.value)}
                        placeholder="Enter Jira story key (e.g., PROJ-123)..."
                        required
                      />
                      <button
                        type="button"
                        className="fetch-button"
                        onClick={handleFetchJiraStory}
                        disabled={isLoading || !jiraFormData.storyKey.trim()}
                      >
                        {isLoading ? 'Fetching...' : 'Fetch'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraDescription" className="form-label">
                      <span className="label-icon">📝</span> Description
                    </label>
                    <textarea
                      id="jiraDescription"
                      className={`form-textarea jira-textarea-description ${jiraFormData.description ? 'readonly-field' : ''}`}
                      value={jiraFormData.description}
                      onChange={(e) => handleJiraInputChange('description', e.target.value)}
                      placeholder="Story description will be populated from Jira..."
                      readOnly={!!jiraFormData.description}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraAdditionalInfo" className="form-label">
                      <span className="label-icon">💡</span> Additional Inputs
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
                      <span className="label-icon">📌</span> Title *
                    </label>
                    <input
                      type="text"
                      id="jiraTitle"
                      className={`form-input ${jiraFormData.title ? 'readonly-field' : ''}`}
                      value={jiraFormData.title}
                      onChange={(e) => handleJiraInputChange('title', e.target.value)}
                      placeholder="Story title will be populated from Jira..."
                      required
                      readOnly={!!jiraFormData.title}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="jiraAcceptanceCriteria" className="form-label">
                      <span className="label-icon">✅</span> Acceptance Criteria *
                    </label>
                    <textarea
                      id="jiraAcceptanceCriteria"
                      className={`form-textarea jira-textarea-acceptance ${jiraFormData.acceptanceCriteria ? 'readonly-field' : ''}`}
                      value={jiraFormData.acceptanceCriteria}
                      onChange={(e) => handleJiraInputChange('acceptanceCriteria', e.target.value)}
                      placeholder="Acceptance criteria will be populated from Jira..."
                      required
                      readOnly={!!jiraFormData.acceptanceCriteria}
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
                </div>
              </div>

              <div className="button-group config-button-group">
                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleSaveConfig}
                  disabled={isConfigLoading}
                >
                  {isConfigLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}

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