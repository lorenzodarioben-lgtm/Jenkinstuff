def runCommand(String unixCommand, String windowsCommand = null) {
  if (isUnix()) {
    sh unixCommand
  } else {
    bat(windowsCommand ?: unixCommand)
  }
}

pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
  }

  environment {
    APP_NAME = 'jenkins-cicd-pipeline'
    PORT = '3000'
    DOCKER_IMAGE = "${APP_NAME}:${BUILD_NUMBER}"
    CONTAINER_NAME = "${APP_NAME}-${BUILD_NUMBER}-smoke"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Runtime Diagnostics') {
      steps {
        script {
          runCommand(
            'node --version && npm --version',
            'node --version && npm.cmd --version'
          )
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          runCommand('npm ci', 'npm.cmd ci')
        }
      }
    }

    stage('Static Analysis') {
      steps {
        script {
          runCommand('npm run lint', 'npm.cmd run lint')
        }
      }
    }

    stage('Automated Tests') {
      steps {
        script {
          runCommand('npm test', 'npm.cmd test')
        }
      }
    }

    stage('Smoke Test') {
      steps {
        script {
          runCommand('npm run smoke', 'npm.cmd run smoke')
        }
      }
    }

    stage('Build Container Image') {
      when {
        expression { return env.BUILD_CONTAINER != 'false' }
      }
      steps {
        script {
          runCommand(
            "docker build --tag ${env.DOCKER_IMAGE} .",
            'docker build --tag %DOCKER_IMAGE% .'
          )
        }
      }
    }

    stage('Verify Container Image') {
      when {
        expression { return env.BUILD_CONTAINER != 'false' }
      }
      steps {
        script {
          runCommand(
            "npm run smoke:container -- ${env.DOCKER_IMAGE}",
            'npm.cmd run smoke:container -- %DOCKER_IMAGE%'
          )
        }
      }
    }

    stage('Security Audit') {
      steps {
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
          script {
            runCommand('npm run audit', 'npm.cmd run audit')
          }
        }
      }
    }

    stage('Archive Verification Reports') {
      steps {
        archiveArtifacts(
          artifacts: 'reports/**',
          allowEmptyArchive: true,
          fingerprint: true
        )
      }
    }
  }

  post {
    success {
      echo "Pipeline completed successfully for ${env.APP_NAME}."
    }
    unstable {
      echo 'Pipeline completed with warnings. Review the security audit output.'
    }
    failure {
      echo 'Pipeline failed. Check the failed stage logs before rerunning.'
    }
    always {
      script {
        if (env.BUILD_CONTAINER != 'false') {
          runCommand(
            "docker rm --force ${env.CONTAINER_NAME} || true",
            'docker rm --force %CONTAINER_NAME% || exit /b 0'
          )
        }
      }
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
