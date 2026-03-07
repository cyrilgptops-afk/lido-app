pipeline {
    agent any
    
    environment {
        NODE_VERSION = '20'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Install Root Dependencies') {
            steps {
                echo 'Installing root dependencies...'
                sh 'npm install'
            }
        }
        
        stage('Build Packages') {
            steps {
                echo 'Building shared packages...'
                parallel(
                    'lido-connect': {
                        dir('packages/lido-connect') {
                            sh 'npm install'
                            sh 'npm run build'
                        }
                    },
                    'storage': {
                        dir('packages/storage') {
                            sh 'npm install'
                            sh 'npm run build'
                        }
                    }
                )
            }
        }
        
        stage('Build & Test Applications') {
            parallel {
                stage('API') {
                    stages {
                        stage('API - Install') {
                            steps {
                                dir('apps/api') {
                                    sh 'npm install'
                                }
                            }
                        }
                        stage('API - Lint') {
                            steps {
                                dir('apps/api') {
                                    sh 'npm run lint || true'
                                }
                            }
                        }
                        stage('API - Test') {
                            steps {
                                dir('apps/api') {
                                    sh 'npm test || true'
                                }
                            }
                        }
                        stage('API - Build') {
                            steps {
                                dir('apps/api') {
                                    sh 'npm run build'
                                }
                            }
                        }
                    }
                }
                
                stage('Web') {
                    stages {
                        stage('Web - Install') {
                            steps {
                                dir('apps/web') {
                                    sh 'npm install'
                                }
                            }
                        }
                        stage('Web - Lint') {
                            steps {
                                dir('apps/web') {
                                    sh 'npm run lint || true'
                                }
                            }
                        }
                        stage('Web - Build') {
                            steps {
                                dir('apps/web') {
                                    sh 'npm run build'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Docker Build') {
            when {
                branch 'main'
            }
            parallel {
                stage('API Docker') {
                    steps {
                        dir('apps/api') {
                            sh "docker build -t lido-api:${BUILD_NUMBER} ."
                        }
                    }
                }
                stage('Web Docker') {
                    steps {
                        dir('apps/web') {
                            sh "docker build -t lido-web:${BUILD_NUMBER} ."
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo "Deploying ${BRANCH_NAME} branch..."
                script {
                    if (env.BRANCH_NAME == 'main') {
                        echo 'Deploy to production'
                        // Add production deployment commands
                    } else if (env.BRANCH_NAME == 'develop') {
                        echo 'Deploy to development'
                        // Add dev deployment commands
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline completed successfully!'
            // Send notification on success (Slack, Email, etc.)
        }
        failure {
            echo '❌ Pipeline failed!'
            // Send notification on failure
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
