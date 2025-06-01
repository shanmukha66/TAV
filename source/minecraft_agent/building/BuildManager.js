import { BuildVerifier } from './BuildVerifier.js';
import { BuildSession } from './BuildSession.js';
import { ConstructionGuardian } from './ConstructionGuardian.js';
import chalk from 'chalk';
import fs from 'fs';

export class BuildManager {
    constructor(agent) {
        this.agent = agent;
        this.bot = agent.bot;
        
        // Initialize building systems
        this.buildVerifier = new BuildVerifier(agent);
        this.constructionGuardian = new ConstructionGuardian(agent);
        
        // Current build state
        this.currentSession = null;
        this.isBuilding = false;
        
        // Attach to agent
        this.agent.buildVerifier = this.buildVerifier;
        this.agent.constructionGuardian = this.constructionGuardian;
        this.agent.buildManager = this;
        
        console.log(chalk.blue(`🏗️ [BUILD MANAGER] Build systems initialized`));
    }

    // Main entry point for building tasks
    async build(buildingType, blueprint, options = {}) {
        console.log(chalk.blue(`🏗️ [BUILD MANAGER] Starting ${buildingType} construction`));
        this.agent.bot.chat(`🏗️ Starting construction of ${buildingType}`);
        
        try {
            // Pre-build validation
            const validation = await this.constructionGuardian.validatePreBuildConditions(blueprint);
            if (!validation.passed && !options.force) {
                console.log(chalk.yellow(`⚠️ [BUILD MANAGER] Pre-build validation failed`));
                return { success: false, reason: 'Pre-build validation failed', details: validation };
            }
            
            // Create build session
            this.currentSession = new BuildSession(this.agent, buildingType, blueprint);
            this.isBuilding = true;
            
            // Start monitoring
            this.constructionGuardian.startMonitoring(this.currentSession);
            
            // Execute building phases
            const result = await this.executeBuildSession();
            
            return result;
            
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD MANAGER] Build failed: ${error.message}`));
            this.agent.bot.chat(`❌ Construction failed: ${error.message}`);
            
            if (this.currentSession) {
                await this.currentSession.handleInterruption(error.message);
            }
            
            return { success: false, error: error.message };
        } finally {
            this.constructionGuardian.stopMonitoring();
            this.isBuilding = false;
        }
    }

    async executeBuildSession() {
        let phasesCompleted = 0;
        
        while (this.currentSession.phase !== 'complete' && this.isBuilding) {
            console.log(chalk.blue(`🚀 [BUILD MANAGER] Executing phase: ${this.currentSession.phase}`));
            
            try {
                const phaseResult = await this.currentSession.executeCurrentPhase();
                
                if (phaseResult) {
                    this.constructionGuardian.updateProgress();
                    this.constructionGuardian.recordSuccess(this.currentSession.phase, {
                        sessionId: this.currentSession.sessionId,
                        timestamp: Date.now()
                    });
                    
                    const nextPhase = await this.currentSession.advancePhase();
                    phasesCompleted++;
                    
                    if (nextPhase === 'complete') {
                        break;
                    }
                } else {
                    console.log(chalk.yellow(`⚠️ [BUILD MANAGER] Phase ${this.currentSession.phase} failed`));
                    this.constructionGuardian.recordFailure(this.currentSession.phase, {
                        sessionId: this.currentSession.sessionId
                    }, 'Phase execution failed');
                    
                    // Try to recover or retry
                    await this.handlePhaseFailure();
                }
                
                // Progress update
                const progress = this.currentSession.getProgressReport();
                if (phasesCompleted % 2 === 0) { // Update every 2 phases
                    console.log(chalk.cyan(`📊 [BUILD MANAGER] Progress: ${progress.progress}% complete`));
                    this.agent.bot.chat(`📊 Construction ${progress.progress}% complete`);
                }
                
            } catch (error) {
                console.log(chalk.red(`❌ [BUILD MANAGER] Phase error: ${error.message}`));
                this.constructionGuardian.recordFailure(this.currentSession.phase, {
                    sessionId: this.currentSession.sessionId,
                    error: error.message
                }, error.message);
                
                await this.handlePhaseFailure();
            }
        }
        
        // Final verification and completion
        if (this.currentSession.phase === 'complete') {
            console.log(chalk.blue(`🔍 [BUILD MANAGER] Starting post-construction verification...`));
            this.agent.bot.chat("🔍 Starting comprehensive structure verification...");
            
            // Comprehensive structure verification
            const verificationResults = await this.performCompleteVerification();
            
            const finalReport = this.currentSession.getProgressReport();
            console.log(chalk.green(`🎉 [BUILD MANAGER] Construction complete!`));
            console.log(chalk.green(`   Duration: ${Math.round(finalReport.duration / 1000)}s`));
            console.log(chalk.green(`   Blocks placed: ${finalReport.placedBlocks}/${finalReport.totalBlocks}`));
            console.log(chalk.green(`   Failed blocks: ${finalReport.failedBlocks}`));
            console.log(chalk.cyan(`   Verification: ${verificationResults.overall.passed ? 'PASSED' : 'FAILED'}`));
            
            this.agent.bot.chat(`🎉 ${this.currentSession.buildingType} construction complete!`);
            this.agent.bot.chat(`📊 Stats: ${finalReport.placedBlocks} blocks, ${Math.round(finalReport.duration / 1000)}s`);
            this.agent.bot.chat(`🔍 Verification: ${verificationResults.overall.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
            
            return { 
                success: true, 
                report: finalReport,
                verification: verificationResults,
                sessionId: this.currentSession.sessionId
            };
        } else {
            return { 
                success: false, 
                reason: 'Construction incomplete',
                progress: this.currentSession.getProgressReport()
            };
        }
    }

    async handlePhaseFailure() {
        console.log(chalk.yellow(`🔧 [BUILD MANAGER] Handling phase failure for: ${this.currentSession.phase}`));
        
        // Create emergency checkpoint
        await this.currentSession.createCheckpoint(`Phase failure: ${this.currentSession.phase}`);
        
        // Try to continue to next phase after a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For now, just advance to next phase
        // In a more sophisticated system, you could implement retry logic
        await this.currentSession.advancePhase();
    }

    // Resume a previous build session
    async resumeBuild(sessionId) {
        console.log(chalk.blue(`🔄 [BUILD MANAGER] Resuming build session: ${sessionId}`));
        
        try {
            this.currentSession = await BuildSession.loadSession(sessionId, this.agent);
            if (!this.currentSession) {
                return { success: false, reason: 'Session not found' };
            }
            
            this.isBuilding = true;
            this.constructionGuardian.startMonitoring(this.currentSession);
            
            const result = await this.executeBuildSession();
            return result;
            
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD MANAGER] Resume failed: ${error.message}`));
            return { success: false, error: error.message };
        } finally {
            this.constructionGuardian.stopMonitoring();
            this.isBuilding = false;
        }
    }

    // Stop current build
    async stopBuild(reason = 'User requested') {
        if (!this.isBuilding || !this.currentSession) {
            console.log(chalk.yellow(`⚠️ [BUILD MANAGER] No active build to stop`));
            return { success: false, reason: 'No active build' };
        }
        
        console.log(chalk.yellow(`⏹️ [BUILD MANAGER] Stopping build: ${reason}`));
        this.agent.bot.chat(`⏹️ Stopping construction: ${reason}`);
        
        this.isBuilding = false;
        
        const interruption = await this.currentSession.handleInterruption(reason);
        this.constructionGuardian.stopMonitoring();
        
        return { success: true, interruption: interruption };
    }

    // Get current build status
    getBuildStatus() {
        if (!this.isBuilding || !this.currentSession) {
            return { building: false };
        }
        
        return {
            building: true,
            session: this.currentSession.getProgressReport(),
            guardian: this.constructionGuardian.getMonitoringStats(),
            verifier: this.buildVerifier.getVerificationStats()
        };
    }

    // List available sessions for resuming
    listSessions() {
        try {
            if (!fs.existsSync('./sessions')) {
                return [];
            }
            
            const files = fs.readdirSync('./sessions');
            const sessions = {};
            
            for (let file of files) {
                if (file.includes('checkpoint')) {
                    const sessionId = file.split('_checkpoint')[0];
                    if (!sessions[sessionId]) {
                        sessions[sessionId] = {
                            sessionId: sessionId,
                            checkpoints: 0,
                            lastModified: fs.statSync(`./sessions/${file}`).mtime
                        };
                    }
                    sessions[sessionId].checkpoints++;
                }
            }
            
            return Object.values(sessions).sort((a, b) => b.lastModified - a.lastModified);
            
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD MANAGER] Error listing sessions: ${error.message}`));
            return [];
        }
    }

    // Create simple building blueprints
    createSimpleHutBlueprint(centerX, centerY, centerZ, size = 5) {
        const blocks = [];
        
        // Foundation
        for (let x = centerX - size; x <= centerX + size; x++) {
            for (let z = centerZ - size; z <= centerZ + size; z++) {
                blocks.push({ type: 'oak_planks', x: x, y: centerY, z: z });
            }
        }
        
        // Walls
        for (let y = centerY + 1; y <= centerY + 3; y++) {
            // North and South walls
            for (let x = centerX - size; x <= centerX + size; x++) {
                blocks.push({ type: 'oak_planks', x: x, y: y, z: centerZ - size });
                blocks.push({ type: 'oak_planks', x: x, y: y, z: centerZ + size });
            }
            // East and West walls
            for (let z = centerZ - size + 1; z <= centerZ + size - 1; z++) {
                blocks.push({ type: 'oak_planks', x: centerX - size, y: y, z: z });
                blocks.push({ type: 'oak_planks', x: centerX + size, y: y, z: z });
            }
        }
        
        // Roof
        for (let x = centerX - size; x <= centerX + size; x++) {
            for (let z = centerZ - size; z <= centerZ + size; z++) {
                blocks.push({ type: 'oak_planks', x: x, y: centerY + 4, z: z });
            }
        }
        
        // Door
        blocks.push({ type: 'oak_door', x: centerX, y: centerY + 1, z: centerZ + size });
        
        return {
            type: 'hut',
            center: { x: centerX, y: centerY, z: centerZ },
            size: size,
            blocks: blocks,
            clearArea: false,
            levelGround: false
        };
    }

    createSimpleWallBlueprint(startX, startY, startZ, endX, endZ, height = 3) {
        const blocks = [];
        
        // Calculate wall direction
        const deltaX = Math.sign(endX - startX);
        const deltaZ = Math.sign(endZ - startZ);
        
        let currentX = startX;
        let currentZ = startZ;
        
        while (currentX !== endX || currentZ !== endZ) {
            for (let y = startY; y < startY + height; y++) {
                blocks.push({ type: 'cobblestone', x: currentX, y: y, z: currentZ });
            }
            
            if (currentX !== endX) currentX += deltaX;
            if (currentZ !== endZ) currentZ += deltaZ;
        }
        
        // Add final block
        for (let y = startY; y < startY + height; y++) {
            blocks.push({ type: 'cobblestone', x: endX, y: y, z: endZ });
        }
        
        return {
            type: 'wall',
            start: { x: startX, y: startY, z: startZ },
            end: { x: endX, y: startY, z: endZ },
            height: height,
            blocks: blocks,
            clearArea: false,
            levelGround: false
        };
    }

    // Building command handlers for chat integration
    async handleBuildCommand(command, args) {
        const botPos = this.bot.entity.position;
        
        switch(command.toLowerCase()) {
            case 'hut':
                const hutSize = args[0] ? parseInt(args[0]) : 3;
                const hutBlueprint = this.createSimpleHutBlueprint(
                    Math.floor(botPos.x), 
                    Math.floor(botPos.y), 
                    Math.floor(botPos.z), 
                    hutSize
                );
                return await this.build('hut', hutBlueprint);
                
            case 'wall':
                const length = args[0] ? parseInt(args[0]) : 10;
                const height = args[1] ? parseInt(args[1]) : 3;
                const wallBlueprint = this.createSimpleWallBlueprint(
                    Math.floor(botPos.x),
                    Math.floor(botPos.y),
                    Math.floor(botPos.z),
                    Math.floor(botPos.x) + length,
                    Math.floor(botPos.z),
                    height
                );
                return await this.build('wall', wallBlueprint);
                
            case 'verify':
            case 'check':
                return await this.manualVerification(args[0] || 'hut');
                
            case 'status':
                const status = this.getBuildStatus();
                if (status.building) {
                    this.agent.bot.chat(`🚧 Building in progress: ${status.session.progress}% complete`);
                    this.agent.bot.chat(`📊 Phase: ${status.session.phase}, Blocks: ${status.session.placedBlocks}/${status.session.totalBlocks}`);
                } else {
                    this.agent.bot.chat("⚡ No active construction");
                }
                return status;
                
            case 'stop':
                return await this.stopBuild('User requested stop');
                
            case 'resume':
                const sessionId = args[0];
                if (sessionId) {
                    return await this.resumeBuild(sessionId);
                } else {
                    const sessions = this.listSessions();
                    if (sessions.length > 0) {
                        this.agent.bot.chat(`📋 Available sessions: ${sessions.map(s => s.sessionId).join(', ')}`);
                        return { success: false, reason: 'Please specify session ID to resume' };
                    } else {
                        this.agent.bot.chat("📋 No saved sessions found");
                        return { success: false, reason: 'No sessions to resume' };
                    }
                }
                
            default:
                this.agent.bot.chat("🏗️ Available commands: hut [size], wall [length] [height], verify [type], status, stop, resume [id]");
                return { success: false, reason: 'Unknown command' };
        }
    }

    async manualVerification(buildingType = 'hut') {
        console.log(chalk.blue(`🔍 [BUILD MANAGER] Manual verification requested for: ${buildingType}`));
        this.agent.bot.chat(`🔍 Starting manual verification for ${buildingType}...`);
        
        try {
            // Create a basic blueprint for verification purposes
            const botPos = this.bot.entity.position;
            let mockBlueprint;
            
            switch(buildingType.toLowerCase()) {
                case 'hut':
                case 'house':
                    mockBlueprint = this.createSimpleHutBlueprint(
                        Math.floor(botPos.x), 
                        Math.floor(botPos.y), 
                        Math.floor(botPos.z), 
                        5 // Default size
                    );
                    break;
                case 'wall':
                    mockBlueprint = this.createSimpleWallBlueprint(
                        Math.floor(botPos.x),
                        Math.floor(botPos.y),
                        Math.floor(botPos.z),
                        Math.floor(botPos.x) + 10,
                        Math.floor(botPos.z),
                        3
                    );
                    break;
                default:
                    // Just do functionality tests without structure validation
                    const functionality = await this.buildVerifier.validateFunctionality(buildingType);
                    
                    this.agent.bot.chat(`🔍 Functionality check: ${functionality.functional ? 'PASSED ✅' : 'FAILED ❌'}`);
                    if (!functionality.functional) {
                        const failedTests = functionality.tests.filter(t => !t.passed);
                        this.agent.bot.chat(`⚠️ ${failedTests.length} issues found - check console for details`);
                    }
                    
                    return { success: true, verification: { functionality: functionality } };
            }
            
            // Perform structure validation
            console.log(chalk.blue(`📐 [MANUAL VERIFY] Checking structure against expected blueprint...`));
            const structure = await this.buildVerifier.validateStructure(mockBlueprint);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Perform functionality tests
            console.log(chalk.blue(`🏗️ [MANUAL VERIFY] Testing functionality...`));
            const functionality = await this.buildVerifier.validateFunctionality(buildingType);
            
            // Calculate results
            const totalTests = 1 + functionality.tests.length;
            const passedTests = (structure.isComplete ? 1 : 0) + 
                               functionality.tests.filter(test => test.passed).length;
            const overallPassed = structure.isComplete && functionality.functional;
            
            // Report results
            console.log(chalk.cyan(`\n📋 [MANUAL VERIFICATION SUMMARY]`));
            console.log(chalk.cyan(`├─ Structure Accuracy: ${structure.accuracy.toFixed(1)}%`));
            console.log(chalk.cyan(`├─ Functionality: ${functionality.functional ? '✅' : '❌'}`));
            console.log(chalk.cyan(`├─ Tests Passed: ${passedTests}/${totalTests}`));
            console.log(chalk.cyan(`└─ Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`));
            
            // In-game messages
            this.agent.bot.chat(`🔍 Verification complete: ${overallPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
            this.agent.bot.chat(`📊 Structure: ${structure.accuracy.toFixed(1)}% accurate, Functionality: ${functionality.functional ? 'OK' : 'Issues'}`);
            
            if (!overallPassed) {
                if (!structure.isComplete) {
                    this.agent.bot.chat(`⚠️ Structure issues: ${structure.missingBlocks.length} missing, ${structure.wrongBlocks.length} wrong blocks`);
                }
                if (!functionality.functional) {
                    const failedTests = functionality.tests.filter(t => !t.passed);
                    this.agent.bot.chat(`⚠️ Functionality issues: ${failedTests.length} tests failed`);
                }
            }
            
            return { 
                success: true, 
                verification: { 
                    structure: structure, 
                    functionality: functionality,
                    overall: overallPassed,
                    accuracy: structure.accuracy
                } 
            };
            
        } catch (error) {
            console.log(chalk.red(`❌ [MANUAL VERIFY] Error: ${error.message}`));
            this.agent.bot.chat("❌ Verification failed - check console for details");
            return { success: false, error: error.message };
        }
    }

    async performCompleteVerification() {
        console.log(chalk.blue(`🔍 [BUILD MANAGER] Performing comprehensive verification...`));
        
        const results = {
            timestamp: new Date().toISOString(),
            structure: null,
            functionality: null,
            overall: { passed: false, tests: 0, passed_tests: 0 }
        };
        
        try {
            // Step 1: Validate structure against blueprint
            console.log(chalk.blue(`📐 [BUILD MANAGER] Step 1: Validating structure against blueprint...`));
            results.structure = await this.buildVerifier.validateStructure(this.currentSession.blueprint);
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Allow time for block registration
            
            // Step 2: Test building functionality
            console.log(chalk.blue(`🏗️ [BUILD MANAGER] Step 2: Testing building functionality...`));
            results.functionality = await this.buildVerifier.validateFunctionality(this.currentSession.buildingType);
            
            // Step 3: Calculate overall results
            let totalTests = 1 + results.functionality.tests.length; // 1 for structure, N for functionality
            let passedTests = (results.structure.isComplete ? 1 : 0) + 
                             results.functionality.tests.filter(test => test.passed).length;
            
            results.overall = {
                passed: results.structure.isComplete && results.functionality.functional,
                tests: totalTests,
                passed_tests: passedTests,
                accuracy: results.structure.accuracy,
                structural_integrity: results.structure.isComplete,
                functional: results.functionality.functional
            };
            
            // Step 4: Detailed reporting
            console.log(chalk.cyan(`\n📋 [VERIFICATION SUMMARY]`));
            console.log(chalk.cyan(`├─ Structure Accuracy: ${results.structure.accuracy.toFixed(1)}%`));
            console.log(chalk.cyan(`├─ Structure Complete: ${results.structure.isComplete ? '✅' : '❌'}`));
            console.log(chalk.cyan(`├─ Functionality: ${results.functionality.functional ? '✅' : '❌'}`));
            console.log(chalk.cyan(`├─ Tests Passed: ${passedTests}/${totalTests}`));
            console.log(chalk.cyan(`└─ Overall: ${results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`));
            
            // Step 5: Detailed issue reporting
            if (!results.overall.passed) {
                console.log(chalk.yellow(`\n⚠️ [ISSUES FOUND]`));
                
                if (!results.structure.isComplete) {
                    if (results.structure.missingBlocks.length > 0) {
                        console.log(chalk.yellow(`├─ Missing blocks: ${results.structure.missingBlocks.length}`));
                    }
                    if (results.structure.wrongBlocks.length > 0) {
                        console.log(chalk.yellow(`├─ Wrong blocks: ${results.structure.wrongBlocks.length}`));
                    }
                }
                
                if (!results.functionality.functional) {
                    const failedTests = results.functionality.tests.filter(test => !test.passed);
                    console.log(chalk.yellow(`├─ Failed functionality tests: ${failedTests.length}`));
                    for (let test of failedTests) {
                        console.log(chalk.yellow(`│  ├─ ${test.test}: ${test.issue || 'Failed'}`));
                    }
                }
            }
            
            // Step 6: Final status message to player
            if (results.overall.passed) {
                this.agent.bot.chat("🎯 Perfect build! All verification checks passed.");
            } else {
                this.agent.bot.chat(`⚠️ Build completed but ${totalTests - passedTests} verification issues found.`);
                if (results.structure.accuracy < 95) {
                    this.agent.bot.chat(`📐 Structure accuracy: ${results.structure.accuracy.toFixed(1)}% (some blocks incorrect/missing)`);
                }
                if (!results.functionality.functional) {
                    this.agent.bot.chat(`🔧 Functionality issues detected - build may not work as intended`);
                }
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD MANAGER] Verification failed: ${error.message}`));
            results.overall = { passed: false, error: error.message };
            this.agent.bot.chat("❌ Verification failed due to error - please check manually");
        }
        
        return results;
    }
} 