allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

subprojects {
    subprojects.forEach { subproject ->
        subproject.afterEvaluate {
            if (subproject.plugins.hasPlugin("com.android.library") || subproject.plugins.hasPlugin("com.android.application")) {
                val android = subproject.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
                android?.compileSdkVersion(36)
            }
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    plugins.withId("com.android.library") {
        val android = project.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
        android?.compileSdkVersion(36)
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
