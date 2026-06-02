// 🚀 Jenkinsfile - Pipeline de CI/CD para Backend Node.js
// 📦 Solución limpia: Usa Docker para evitar la instalación de plugins en Jenkins

pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        PROJECT_NAME = 'minimarket-ecommerce'
        COMPOSE_FILE = 'docker/docker-compose.yml'
        REPO_URL     = 'https://github.com/jhordyvela/docker-2.git'
        
        // Tu token activo de SonarQube
        SONAR_AUTH   = 'squ_3c882d37e6dbbf08024ffe2092e2f903520d4c34'
    }

    stages {
        // 📥 Etapa 1: Clonación limpia del repositorio
        stage('Checkout') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    echo '🔄 === CLONANDO REPOSITORIO ==='
                    cleanWs()
                    git branch: 'master', url: "${REPO_URL}"
                }
            }
        }

        // 🏗️ Etapa 2: Construcción de la imagen Docker de tu Backend Node
        stage('Docker build') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    echo '🔨 === CONSTRUYENDO IMAGEN DEL BACKEND ==='
                    sh "docker compose -p ${PROJECT_NAME} -f ${COMPOSE_FILE} build backend"
                }
            }
        }

        // 🧹 Etapa 3: Limpieza preventiva de entornos anteriores
        stage('Clean deploy') {
            steps {
                echo '🧹 === LIMPIANDO ENTORNO ANTERIOR ==='
                sh "docker compose -p ${PROJECT_NAME} -f ${COMPOSE_FILE} down -v --remove-orphans || true"
            }
        }

        // 🚀 Etapa 4: Despliegue de los contenedores
        stage('Docker deploy') {
            steps {
                echo '🚀 === LEVANTANDO SERVICIOS (DB & BACKEND) ==='
                sh "docker compose -p ${PROJECT_NAME} -f ${COMPOSE_FILE} up -d db backend"
            }
        }

        // 🔍 Etapa 5: Test de humo para confirmar estabilidad
        stage('Smoke test') {
            steps {
                echo '🔍 === VERIFICANDO ESTADO DE LOS SERVICIOS ==='
                sleep(10)
                sh "docker compose -p ${PROJECT_NAME} -f ${COMPOSE_FILE} ps"
            }
        }

        // 🧪 Etapa 6: Ejecución de pruebas unitarias y cobertura (Dentro del contenedor backend)
        stage('Unit Tests with Coverage') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    echo '🧪 === EJECUTANDO PRUEBAS UNITARIAS Y COBERTURA ==='
                    sh "docker compose -p ${PROJECT_NAME} -f ${COMPOSE_FILE} exec -T backend sh -c 'npm install && npm run test:coverage'"
                }
            }
        }

        // 📊 Etapa 7: Análisis de SonarQube indexando archivos Node.js y Cobertura
        stage('SonarQube Analysis') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    echo '📊 === INICIANDO ANÁLISIS COMPLETO DE JAVASCRIPT ==='
                    sh """
                    docker run --rm \
                        -u root \
                        --network=docker_default \
                        -v "${WORKSPACE}:/usr/src" \
                        sonarsource/sonar-scanner-cli \
                        -Dsonar.projectKey=minimarket-ecommerce \
                        -Dsonar.projectName=minimarket-ecommerce \
                        -Dsonar.sources=/usr/src \
                        -Dsonar.exclusions=**/node_modules/**,**/test/**,**/coverage/** \
                        -Dsonar.tests=/usr/src/test \
                        -Dsonar.test.inclusions=/usr/src/test/**/*.test.js \
                        -Dsonar.javascript.lcov.reportPaths=/usr/src/coverage/lcov.info \
                        -Dsonar.host.url=http://docker.sonar:9000 \
                        -Dsonar.login=squ_3c882d37e6dbbf08024ffe2092e2f903520d4c34
                    """
                }
            }
        }
    }

    post {
        always {
            echo '🏁 === PIPELINE FINALIZADO ==='
        }
        success {
            echo '🎉 ✓ ¡Análisis y despliegue completados exitosamente!'
        }
        failure {
            echo '💥 ✗ El pipeline falló.'
        }
    }
}