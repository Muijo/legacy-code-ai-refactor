// No authentication needed - removed auth service

class RefactoringDashboard {
    constructor() {
        // No authentication check needed
        
        // Initialize Socket.IO without authentication
        this.socket = io();
        
        this.currentProject = null;
        this.projects = [];
        this.currentIntervention = null;
        this.user = { name: 'Guest User' };
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.displayUser();
        this.loadProjects();
    }
    
    displayUser() {
        const userName = document.getElementById('userName');
        if (userName && this.user) {
            userName.textContent = `Welcome, ${this.user.name}`;
        }
    }

    initializeEventListeners() {
        // No logout button needed
        
        // Navigation
        document.getElementById('newProjectBtn').addEventListener('click', () => {
            this.showNewProjectModal();
        });

        document.getElementById('backToProjectsBtn').addEventListener('click', () => {
            this.showProjectsSection();
        });

        // Modal events
        document.getElementById('cancelProjectBtn').addEventListener('click', () => {
            this.hideNewProjectModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideNewProjectModal();
        });

        // Form submission
        document.getElementById('newProjectForm').addEventListener('submit', (e) => {
            this.handleNewProjectSubmit(e);
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Project actions
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.startAnalysis();
        });

        document.getElementById('refactorBtn').addEventListener('click', () => {
            this.startRefactoring();
        });

        // Intervention handling
        document.getElementById('approveInterventionBtn').addEventListener('click', () => {
            this.handleIntervention('approve');
        });

        document.getElementById('skipInterventionBtn').addEventListener('click', () => {
            this.handleIntervention('skip');
        });

        // Review tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('review-tab-btn')) {
                this.switchReviewTab(e.target.dataset.tab);
            }
        });
    }

    initializeSocketListeners() {
        this.socket.on('analysisProgress', (data) => {
            this.updateAnalysisProgress(data);
        });

        this.socket.on('refactoringProgress', (data) => {
            this.updateRefactoringProgress(data);
        });

        this.socket.on('manualInterventionRequired', (data) => {
            this.showManualIntervention(data);
        });

        this.socket.on('reviewUpdated', (data) => {
            this.handleReviewUpdate(data);
        });
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            this.projects = await response.json();
            this.renderProjects();
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    renderProjects() {
        const projectsList = document.getElementById('projectsList');
        
        if (this.projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <p>No projects yet. Create your first refactoring project!</p>
                </div>
            `;
            return;
        }

        projectsList.innerHTML = this.projects.map(project => `
            <div class="project-card" onclick="dashboard.showProjectDetails('${project.id}')">
                <h3>${project.name}</h3>
                <p>${project.description || 'No description'}</p>
                <div class="project-meta">
                    <span class="status-badge status-${project.status}">${project.status}</span>
                    <span>${new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    async showProjectDetails(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            this.currentProject = await response.json();
            
            this.socket.emit('joinProject', projectId);
            
            document.getElementById('projectsSection').classList.add('hidden');
            document.getElementById('projectDetailsSection').classList.remove('hidden');
            
            this.renderProjectDetails();
        } catch (error) {
            console.error('Failed to load project details:', error);
        }
    }

    renderProjectDetails() {
        const project = this.currentProject;
        
        // Update project title and status
        document.getElementById('projectTitle').textContent = project.name;
        document.getElementById('projectStatus').textContent = project.status;
        document.getElementById('projectStatus').className = `status-badge status-${project.status}`;
        
        // Update progress bars
        document.getElementById('analysisProgress').style.width = `${project.progress.analysis}%`;
        document.getElementById('refactoringProgress').style.width = `${project.progress.refactoring}%`;
        
        // Update action buttons
        const analyzeBtn = document.getElementById('analyzeBtn');
        const refactorBtn = document.getElementById('refactorBtn');
        
        analyzeBtn.disabled = project.status === 'analyzing';
        refactorBtn.disabled = project.status !== 'analyzed' && project.status !== 'completed';
        
        // Render analysis results if available
        if (project.analysis) {
            this.renderAnalysisResults(project.analysis);
        }
        
        // Render suggestions if available
        if (project.suggestions && project.suggestions.length > 0) {
            this.renderSuggestions(project.suggestions);
        }
        
        // Render refactoring status
        if (project.status === 'refactoring' || project.status === 'completed') {
            this.renderRefactoringStatus();
        }
        
        // Render interventions
        if (project.interventions && project.interventions.length > 0) {
            this.renderInterventions(project.interventions);
        }
        
        // Render results if available
        if (project.results) {
            this.renderResults(project.results);
        }
        
        // Load and render reviews
        this.loadProjectReviews(project.id);
    }

    renderAnalysisResults(analysis) {
        const analysisTab = document.getElementById('analysisResults');
        const summary = analysis.summary;
        
        analysisTab.innerHTML = `
            <div class="analysis-summary">
                <h3>Analysis Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Total Files</span>
                        <span class="summary-value">${summary.totalFiles}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Lines</span>
                        <span class="summary-value">${summary.totalLines.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Avg Complexity</span>
                        <span class="summary-value">${summary.averageComplexity}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Technical Debt</span>
                        <span class="summary-value">${summary.averageTechnicalDebt}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Business Components</span>
                        <span class="summary-value">${summary.businessLogicComponents}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Detected Patterns</span>
                        <span class="summary-value">${summary.detectedPatterns}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderSuggestions(suggestions) {
        const suggestionsTab = document.getElementById('suggestionsList');
        
        suggestionsTab.innerHTML = `
            <div class="suggestions-header">
                <h3>Modernization Suggestions</h3>
                <button class="btn btn-primary" onclick="dashboard.selectAllSuggestions()">Select All</button>
            </div>
            <div class="suggestions-list">
                ${suggestions.map(suggestion => `
                    <div class="suggestion-item">
                        <div class="suggestion-header">
                            <div>
                                <input type="checkbox" id="suggestion-${suggestion.id}" value="${suggestion.id}">
                                <label for="suggestion-${suggestion.id}" class="suggestion-title">${suggestion.description}</label>
                            </div>
                            <span class="suggestion-priority priority-${suggestion.priority}">${suggestion.priority}</span>
                        </div>
                        <div class="suggestion-details">
                            <div class="suggestion-benefits">
                                <h4>Benefits</h4>
                                <ul>
                                    ${suggestion.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="suggestion-risks">
                                <h4>Risks</h4>
                                <ul>
                                    ${suggestion.risks.map(risk => `<li>${risk}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="suggestion-meta">
                            <span>Effort: ${suggestion.effort}</span>
                            <span>Impact: ${suggestion.impact}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRefactoringStatus() {
        const refactoringTab = document.getElementById('refactoringStatus');
        
        refactoringTab.innerHTML = `
            <div class="refactoring-progress">
                <h3>Refactoring Progress</h3>
                <div class="progress-item">
                    <span>Overall Progress</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${this.currentProject.progress.refactoring}%"></div>
                    </div>
                    <span>${this.currentProject.progress.refactoring}%</span>
                </div>
            </div>
        `;
    }

    renderInterventions(interventions) {
        const interventionsList = document.getElementById('interventionsList');
        
        const pendingInterventions = interventions.filter(i => i.status === 'pending');
        
        if (pendingInterventions.length === 0) {
            interventionsList.innerHTML = '<p>No pending interventions.</p>';
            return;
        }
        
        interventionsList.innerHTML = `
            <h3>Manual Interventions Required</h3>
            ${pendingInterventions.map(intervention => `
                <div class="intervention-item">
                    <div class="intervention-header">
                        <span class="intervention-title">${intervention.description}</span>
                        <span class="intervention-status">${intervention.status}</span>
                    </div>
                    <div class="intervention-actions">
                        <button class="btn btn-primary" onclick="dashboard.showInterventionModal('${intervention.id}')">
                            Review
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    renderResults(results) {
        const resultsTab = document.getElementById('refactoringResults');
        const summary = results.summary;
        
        resultsTab.innerHTML = `
            <div class="results-summary">
                <h3>Refactoring Results</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Total Steps</span>
                        <span class="summary-value">${summary.totalSteps}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Completed</span>
                        <span class="summary-value">${summary.completedSteps}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Success Rate</span>
                        <span class="summary-value">${summary.successRate}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Changes</span>
                        <span class="summary-value">${summary.totalChanges}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Warnings</span>
                        <span class="summary-value">${summary.totalWarnings}</span>
                    </div>
                </div>
            </div>
        `;
    }

    showProjectsSection() {
        document.getElementById('projectDetailsSection').classList.add('hidden');
        document.getElementById('projectsSection').classList.remove('hidden');
        this.currentProject = null;
    }

    showNewProjectModal() {
        document.getElementById('newProjectModal').classList.add('show');
    }

    hideNewProjectModal() {
        document.getElementById('newProjectModal').classList.remove('show');
        document.getElementById('newProjectForm').reset();
    }

    async handleNewProjectSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const project = await response.json();
                this.projects.push(project);
                this.renderProjects();
                this.hideNewProjectModal();
            } else {
                throw new Error('Failed to create project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project. Please try again.');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    async startAnalysis() {
        if (!this.currentProject) return;
        
        try {
            const response = await fetch(`/api/projects/${this.currentProject.id}/analyze`, {
                method: 'POST'
            });
            
            if (response.ok) {
                document.getElementById('analyzeBtn').disabled = true;
                this.currentProject.status = 'analyzing';
                this.renderProjectDetails();
            }
        } catch (error) {
            console.error('Failed to start analysis:', error);
        }
    }

    async startRefactoring() {
        if (!this.currentProject) return;
        
        const selectedSuggestions = Array.from(
            document.querySelectorAll('#suggestionsList input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        if (selectedSuggestions.length === 0) {
            alert('Please select at least one suggestion to proceed with refactoring.');
            return;
        }
        
        try {
            const response = await fetch(`/api/projects/${this.currentProject.id}/refactor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ selectedSuggestions })
            });
            
            if (response.ok) {
                document.getElementById('refactorBtn').disabled = true;
                this.currentProject.status = 'refactoring';
                this.renderProjectDetails();
            }
        } catch (error) {
            console.error('Failed to start refactoring:', error);
        }
    }

    selectAllSuggestions() {
        document.querySelectorAll('#suggestionsList input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    }

    updateAnalysisProgress(data) {
        if (data.projectId === this.currentProject?.id) {
            this.currentProject.progress.analysis = data.progress.progress;
            document.getElementById('analysisProgress').style.width = `${data.progress.progress}%`;
            
            if (data.progress.completed) {
                this.currentProject.status = 'analyzed';
                document.getElementById('analyzeBtn').disabled = false;
                document.getElementById('refactorBtn').disabled = false;
                this.renderProjectDetails();
            }
        }
    }

    updateRefactoringProgress(data) {
        if (data.projectId === this.currentProject?.id) {
            this.currentProject.progress.refactoring = data.progress.progress;
            document.getElementById('refactoringProgress').style.width = `${data.progress.progress}%`;
            
            if (data.progress.completed) {
                this.currentProject.status = 'completed';
                this.renderProjectDetails();
            }
        }
    }

    showManualIntervention(intervention) {
        this.currentIntervention = intervention;
        
        document.getElementById('interventionContent').innerHTML = `
            <div class="intervention-details">
                <h4>${intervention.description}</h4>
                <p>${intervention.context}</p>
                ${intervention.options ? `
                    <div class="intervention-options">
                        <h5>Options:</h5>
                        <ul>
                            ${intervention.options.map(option => `<li>${option}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
            <div class="form-group">
                <label for="interventionNotes">Notes (optional)</label>
                <textarea id="interventionNotes" rows="3" placeholder="Add any notes about your decision..."></textarea>
            </div>
        `;
        
        document.getElementById('interventionModal').classList.add('show');
    }

    async handleIntervention(decision) {
        if (!this.currentIntervention) return;
        
        const notes = document.getElementById('interventionNotes').value;
        
        try {
            const response = await fetch(`/api/projects/${this.currentIntervention.projectId}/intervention`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    interventionId: this.currentIntervention.id,
                    decision,
                    notes
                })
            });
            
            if (response.ok) {
                document.getElementById('interventionModal').classList.remove('show');
                this.currentIntervention = null;
            }
        } catch (error) {
            console.error('Failed to handle intervention:', error);
        }
    }

    // Review functionality
    async loadProjectReviews(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}/reviews`);
            const reviews = await response.json();
            this.renderReviews(reviews);
        } catch (error) {
            console.error('Failed to load reviews:', error);
        }
    }

    renderReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p>No reviews available yet.</p>';
            return;
        }

        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-item" onclick="dashboard.showReviewModal('${review.id}')">
                <div class="review-header">
                    <div class="review-title">Review #${review.id}</div>
                    <div class="review-badges">
                        <span class="risk-badge risk-${review.riskLevel}">${review.riskLevel.replace('-', ' ')}</span>
                        <span class="confidence-badge">${Math.round(review.aiConfidence * 100)}% Confidence</span>
                        <span class="status-badge status-${review.status}">${review.status}</span>
                    </div>
                </div>
                <div class="review-summary">
                    ${review.changes.length} changes • ${review.reviewers.length} reviewers • 
                    Created ${new Date(review.createdAt).toLocaleDateString()}
                </div>
                <div class="review-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); dashboard.showReviewModal('${review.id}')">
                        Review Code
                    </button>
                </div>
            </div>
        `).join('');
    }

    async showReviewModal(reviewId) {
        try {
            const response = await fetch(`/api/reviews/${reviewId}`);
            const review = await response.json();
            
            this.currentReview = review;
            
            // Update modal content
            document.getElementById('reviewModalTitle').textContent = `Review #${review.id}`;
            document.getElementById('reviewRiskLevel').textContent = review.riskLevel.replace('-', ' ');
            document.getElementById('reviewRiskLevel').className = `risk-badge risk-${review.riskLevel}`;
            document.getElementById('reviewConfidence').textContent = `${Math.round(review.aiConfidence * 100)}% Confidence`;
            document.getElementById('reviewStatus').textContent = review.status;
            document.getElementById('reviewStatus').className = `status-badge status-${review.status}`;
            
            // Render code diff
            this.renderCodeDiff(review.diff);
            
            // Render analysis
            this.renderReviewAnalysis(review);
            
            // Render comments
            this.renderReviewComments(review.comments);
            
            // Show modal
            document.getElementById('reviewModal').classList.add('show');
            
        } catch (error) {
            console.error('Failed to load review details:', error);
        }
    }

    renderCodeDiff(diff) {
        const codeDiff = document.getElementById('codeDiff');
        
        if (!diff || diff.length === 0) {
            codeDiff.innerHTML = '<p>No changes to display.</p>';
            return;
        }

        codeDiff.innerHTML = `
            <div class="code-diff">
                ${diff.map(change => `
                    <div class="diff-line ${change.type}">
                        <div class="diff-line-number">${change.lineNumber}</div>
                        <div class="diff-line-content">
                            ${change.type === 'modified' ? 
                                `<div class="removed-line">- ${this.escapeHtml(change.original)}</div>
                                 <div class="added-line">+ ${this.escapeHtml(change.refactored)}</div>` :
                                `${change.type === 'added' ? '+' : '-'} ${this.escapeHtml(change.content)}`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderReviewAnalysis(review) {
        const analysisTab = document.getElementById('reviewAnalysis');
        
        analysisTab.innerHTML = `
            <div class="review-analysis">
                <h4>Change Analysis</h4>
                <div class="analysis-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Lines Added:</span>
                        <span class="metric-value">${review.metrics.linesAdded}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Lines Removed:</span>
                        <span class="metric-value">${review.metrics.linesRemoved}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Lines Modified:</span>
                        <span class="metric-value">${review.metrics.linesModified}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Total Changes:</span>
                        <span class="metric-value">${review.metrics.totalChanges}</span>
                    </div>
                </div>
                
                <h4>Risk Assessment</h4>
                <div class="risk-analysis">
                    <p><strong>Risk Level:</strong> ${review.riskLevel.replace('-', ' ')}</p>
                    <p><strong>AI Confidence:</strong> ${Math.round(review.aiConfidence * 100)}%</p>
                    <p><strong>Approval Rule:</strong> ${review.rule.description}</p>
                    <p><strong>Required Reviewers:</strong> ${review.rule.minimumReviewers}</p>
                </div>
            </div>
        `;
    }

    renderReviewComments(comments) {
        const commentsTab = document.getElementById('reviewComments');
        
        if (comments.length === 0) {
            commentsTab.innerHTML = '<p>No comments yet.</p>';
        } else {
            commentsTab.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author || 'Anonymous'}</span>
                        <span class="comment-date">${new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="comment-content">${this.escapeHtml(comment.content)}</div>
                </div>
            `).join('');
        }
    }

    hideReviewModal() {
        document.getElementById('reviewModal').classList.remove('show');
        this.currentReview = null;
    }

    switchReviewTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.review-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.review-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    addComment() {
        const commentText = document.getElementById('newComment').value.trim();
        if (!commentText) return;
        
        // Add comment to current review (this would normally be sent to server)
        const comment = {
            author: 'Current User', // In real app, get from auth
            content: commentText,
            timestamp: new Date().toISOString()
        };
        
        this.currentReview.comments.push(comment);
        this.renderReviewComments(this.currentReview.comments);
        document.getElementById('newComment').value = '';
    }

    async submitReview() {
        if (!this.currentReview) return;
        
        const decision = document.querySelector('input[name="reviewDecision"]:checked')?.value;
        if (!decision) {
            alert('Please select a review decision.');
            return;
        }
        
        // Collect feedback
        const feedback = {
            aiAccuracy: parseInt(document.getElementById('aiAccuracyRating').value) || null,
            codeQuality: parseInt(document.getElementById('codeQualityRating').value) || null,
            usefulnessRating: parseInt(document.getElementById('usefulnessRating').value) || null,
            wouldUseAgain: document.getElementById('wouldUseAgain').checked,
            comments: document.getElementById('feedbackComments').value.trim()
        };
        
        // Collect comments
        const comments = this.currentReview.comments.map(c => ({
            content: c.content,
            timestamp: c.timestamp
        }));
        
        try {
            const response = await fetch(`/api/reviews/${this.currentReview.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewerId: 'current-user', // In real app, get from auth
                    decision,
                    comments,
                    feedback
                })
            });
            
            if (response.ok) {
                this.hideReviewModal();
                // Reload reviews to show updated status
                this.loadProjectReviews(this.currentProject.id);
                alert('Review submitted successfully!');
            } else {
                throw new Error('Failed to submit review');
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            alert('Failed to submit review. Please try again.');
        }
    }

    handleReviewUpdate(data) {
        // Handle real-time review updates
        if (this.currentProject && data.review.projectId === this.currentProject.id) {
            this.loadProjectReviews(this.currentProject.id);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when page loads
const dashboard = new RefactoringDashboard();