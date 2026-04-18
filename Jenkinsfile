pipeline {
    agent any

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'main', description: 'Git branch to deploy')
        string(name: 'DEPLOY_ENV', defaultValue: 'production', description: 'Deployment environment (staging/production)')
    }

    environment {
        PROJECT_NAME = "jewelleryscheme"
        DOCKER_COMPOSE = "docker compose"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: params.BRANCH_NAME, url: 'https://github.com/stechnotools/stechscheme.git'
            }
        }

        stage('Prepare Environment') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: "DB_PASSWORD_${params.DEPLOY_ENV}", variable: 'DB_PASSWORD'),
                        string(credentialsId: "APP_KEY_${params.DEPLOY_ENV}", variable: 'APP_KEY'),
                        string(credentialsId: 'NEXTAUTH_SECRET', variable: 'NEXTAUTH_SECRET')
                    ]) {
                        sh "cp .env.example .env"
                        sh "sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/' .env"
                        sh "sed -i 's/APP_KEY=.*/APP_KEY=${APP_KEY}/' .env"
                        sh "sed -i 's/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=${NEXTAUTH_SECRET}/' .env"
                    }
                }
            }
        }

        stage('Build Services') {
            steps {
                sh "${DOCKER_COMPOSE} build --no-cache"
            }
        }

        stage('Tag Current Images for Rollback') {
            steps {
                script {
                    sh '''
                        docker images --format "{{.Repository}}:{{.Tag}}" jewelleryscheme* | while read img; do
                            rollback=$(echo "$img" | sed 's|jewelleryscheme-|jewelleryscheme-roll-|' | sed 's|:latest|:rollback|')
                            docker tag "$img" "$rollback" 2>/dev/null || true
                        done
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh "${DOCKER_COMPOSE} up -d --remove-orphans"
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sh '''
                        echo "Waiting for services to become healthy..."
                        for i in $(seq 1 30); do
                            if ${DOCKER_COMPOSE} ps --format json 2>/dev/null | grep -q '"Health":"healthy"' 2>/dev/null; then
                                echo "All services healthy"
                                exit 0
                            fi
                            echo "Attempt $i/30: waiting..."
                            sleep 5
                        done
                        echo "Health check failed after 150s"
                        exit 1
                    '''
                }
            }
        }

        stage('Post-Deployment') {
            steps {
                sh "${DOCKER_COMPOSE} exec -T backend php artisan migrate --force"
                sh "${DOCKER_COMPOSE} exec -T backend php artisan config:clear"
                sh "${DOCKER_COMPOSE} exec -T backend php artisan cache:clear"
            }
        }

        stage('Cleanup') {
            steps {
                sh "docker image prune -f --filter 'dangling=true'"
            }
        }
    }

    post {
        success {
            echo "Deployment of ${params.BRANCH_NAME} to ${params.DEPLOY_ENV} successful!"
        }
        failure {
            echo "Deployment failed! Rolling back..."
            sh '''
                docker compose down
                docker images --format "{{.Repository}}:{{.Tag}}" jewelleryscheme-roll-* | while read img; do
                    original=$(echo "$img" | sed 's|jewelleryscheme-roll-|jewelleryscheme-|' | sed 's|:rollback|:latest|')
                    docker tag "$img" "$original" 2>/dev/null || true
                done
                docker compose up -d --remove-orphans
            '''
        }
    }
}
