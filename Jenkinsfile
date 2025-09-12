pipeline {
  agent any
  stages {
    stage('Build Phase') {
      steps {
        echo 'Task: Build and package the source code into an artifact.'
        echo 'Tool(s): Gradle'
      }
    }
    stage('Unit & Integration Testing') {
      steps {
        echo 'Task: Validate code with unit tests and verify modules work together with integration tests.'
        echo 'Tool(s): NUnit for unit tests, Mocha for integration tests'
      }
    }

        stage('Testing123') {
      steps {
        echo 'Task: See, it works..'
        echo 'Tool(s): NUnit for unit tests, Mocha for integration tests'
      }
    }

      stage('bananas'){
      steps {
        echo'Test'
    }
      }
    stage('Static Code Review') {
      steps {
        echo 'Task: Run static code review to check style, maintainability, and detect common issues.'
        echo 'Tool(s): ESLint'
      }
    }
    stage('Security Audit') {
      steps {
        echo 'Task: Perform a vulnerability scan of dependencies and codebase.'
        echo 'Tool(s): OWASP Dependency-Check'
      }
    }
    stage('Staging Deployment') {
      steps {
        echo 'Task: Push the built artifact into a staging server for pre-production testing.'
        echo 'Tool(s): Docker Compose'
      }
    }
    stage('Staging Verification Tests') {
      steps {
        echo 'Task: Run system-level checks and API/UI tests on the staging environment.'
        echo 'Tool(s): Postman for API tests, Cypress for UI tests'
      }
    }
    stage('Production Release') {
      steps {
        echo 'Task: Roll out the application to the production environment.'
        echo 'Tool(s): Kubernetes with kubectl/Helm'
      }
    }
  }
}



