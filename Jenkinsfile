pipeline {
    agent any

    environment {
        // Define common variables
        PROJECT_NAME = "jewelleryscheme"
        DOCKER_COMPOSE = "docker compose"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/stechnotools/stechscheme.git'
            }
        }

        stage('Prepare Environment') {
            steps {
                script {
                    // Load environment variables from Jenkins Credentials
                    withCredentials([
                        string(credentialsId: 'DB_PASSWORD', variable: 'DB_PASSWORD'),
                        string(credentialsId: 'APP_KEY', variable: 'APP_KEY'),
                        string(credentialsId: 'NEXTAUTH_SECRET', variable: 'NEXTAUTH_SECRET')
                    ]) {
                        // Create/Update .env file for the build
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
                sh "${DOCKER_COMPOSE} build"
            }
        }

        stage('Deploy') {
            steps {
                // Restart containers with the new images
                sh "${DOCKER_COMPOSE} up -d"
            }
        }

        stage('Post-Deployment') {
            steps {
                // Run migrations to ensure DB schema is up to date
                sh "${DOCKER_COMPOSE} exec -T backend php artisan migrate --force"
                
                // Optional: Clear caches
                sh "${DOCKER_COMPOSE} exec -T backend php artisan config:clear"
                sh "${DOCKER_COMPOSE} exec -T backend php artisan cache:clear"
            }
        }

        stage('Cleanup') {
            steps {
                // Remove unused images to save disk space
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo "Deployment successful!"
        }
        failure {
            echo "Deployment failed! Please check logs."
        }
    }
}
