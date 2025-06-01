import chalk from 'chalk';
import fs from 'fs';
import Vec3 from 'vec3';

export class ConstructionGuardian {
    constructor(agent) {
        this.agent = agent;
        this.bot = agent.bot;
        this.monitoringActive = false;
        this.warnings = [];
        this.failures = [];
        this.thresholds = {
            maxStagnantTime: 30000, // 30 seconds
            maxRepeatedFailures: 5,
            minResourcesThreshold: 10,
            maxDistanceFromSite: 20,
            healthThreshold: 5
        };
        this.monitoring = {
            lastProgressTime: Date.now(),
            lastPosition: null,
            repeatedFailures: {},
            environmentChecks: {
                lastWeatherCheck: 0,
                lastMobCheck: 0
            }
        };
        this.patterns = {
            failures: [],
            successes: []
        };
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync('./logs')) {
            fs.mkdirSync('./logs', { recursive: true });
        }
    }

    // Start monitoring the construction process
    startMonitoring(buildSession) {
        if (this.monitoringActive) {
            console.log(chalk.yellow(`⚠️ [GUARDIAN] Monitoring already active`));
            return;
        }

        this.monitoringActive = true;
        this.buildSession = buildSession;
        console.log(chalk.blue(`🛡️ [GUARDIAN] Construction monitoring started for session: ${buildSession.sessionId}`));
        this.agent.bot.chat("🛡️ Construction Guardian activated - monitoring for issues");

        // Start monitoring intervals
        this.startProgressMonitoring();
        this.startEnvironmentMonitoring();
        this.startResourceMonitoring();
        this.startHealthMonitoring();

        return true;
    }

    // Stop monitoring
    stopMonitoring() {
        this.monitoringActive = false;
        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.environmentInterval) clearInterval(this.environmentInterval);
        if (this.resourceInterval) clearInterval(this.resourceInterval);
        if (this.healthInterval) clearInterval(this.healthInterval);

        console.log(chalk.blue(`🛡️ [GUARDIAN] Monitoring stopped`));
        this.agent.bot.chat("🛡️ Construction Guardian deactivated");
    }

    // Pre-build validation
    async validatePreBuildConditions(blueprint) {
        console.log(chalk.blue(`🔍 [GUARDIAN] Performing pre-build validation...`));
        const validations = [];

        // Check materials
        const materialCheck = await this.validateMaterials(blueprint);
        validations.push(materialCheck);

        // Check terrain
        const terrainCheck = await this.validateTerrain(blueprint);
        validations.push(terrainCheck);

        // Check environment
        const environmentCheck = await this.validateEnvironment();
        validations.push(environmentCheck);

        // Check tools
        const toolCheck = await this.validateTools();
        validations.push(toolCheck);

        const allPassed = validations.every(v => v.passed);
        const warnings = validations.filter(v => !v.passed);

        if (warnings.length > 0) {
            console.log(chalk.yellow(`⚠️ [GUARDIAN] Pre-build warnings found:`));
            for (let warning of warnings) {
                console.log(chalk.yellow(`   - ${warning.message}`));
            }
            this.agent.bot.chat(`⚠️ Pre-build check: ${warnings.length} warnings found`);
        } else {
            console.log(chalk.green(`✅ [GUARDIAN] Pre-build validation passed`));
            this.agent.bot.chat("✅ Pre-build validation passed - ready to build");
        }

        this.logValidation('pre_build', validations);
        return { passed: allPassed, warnings: warnings, validations: validations };
    }

    async validateMaterials(blueprint) {
        const requiredMaterials = this.analyzeRequiredMaterials(blueprint);
        const currentInventory = this.analyzeCurrentInventory();
        const missingMaterials = [];

        for (let [material, needed] of Object.entries(requiredMaterials)) {
            const have = currentInventory[material] || 0;
            if (have < needed) {
                missingMaterials.push({ material, needed, have, missing: needed - have });
            }
        }

        return {
            type: 'materials',
            passed: missingMaterials.length === 0,
            message: missingMaterials.length > 0 ? 
                `Missing materials: ${missingMaterials.map(m => `${m.missing} ${m.material}`).join(', ')}` :
                'All required materials available',
            details: { missingMaterials, requiredMaterials, currentInventory }
        };
    }

    async validateTerrain(blueprint) {
        const buildArea = this.calculateBuildArea(blueprint);
        const terrainIssues = [];

        // Check for obstacles in build area
        for (let x = buildArea.minX; x <= buildArea.maxX; x++) {
            for (let z = buildArea.minZ; z <= buildArea.maxZ; z++) {
                for (let y = buildArea.minY; y <= buildArea.maxY; y++) {
                    const block = this.bot.blockAt(new Vec3(x, y, z));
                    if (block && block.name !== 'air' && !this.isNaturalTerrain(block.name)) {
                        terrainIssues.push({ x, y, z, blockType: block.name });
                    }
                }
            }
        }

        return {
            type: 'terrain',
            passed: terrainIssues.length === 0,
            message: terrainIssues.length > 0 ? 
                `${terrainIssues.length} terrain obstacles found in build area` :
                'Build area is clear',
            details: { terrainIssues, buildArea }
        };
    }

    async validateEnvironment() {
        const environmentIssues = [];

        // Check weather
        if (this.bot.isRaining) {
            environmentIssues.push('Raining - may affect visibility and movement');
        }

        // Check time of day
        const timeOfDay = this.bot.time.timeOfDay;
        if (timeOfDay > 13000 && timeOfDay < 23000) { // Night time
            environmentIssues.push('Night time - reduced visibility and mob spawning');
        }

        // Check for nearby hostile mobs
        const nearbyMobs = this.findNearbyHostileMobs();
        if (nearbyMobs.length > 0) {
            environmentIssues.push(`${nearbyMobs.length} hostile mobs nearby`);
        }

        return {
            type: 'environment',
            passed: environmentIssues.length === 0,
            message: environmentIssues.length > 0 ? 
                `Environment issues: ${environmentIssues.join(', ')}` :
                'Environment conditions are good',
            details: { environmentIssues, timeOfDay, isRaining: this.bot.isRaining, nearbyMobs }
        };
    }

    async validateTools() {
        const requiredTools = ['wooden_pickaxe', 'wooden_shovel'];
        const availableTools = this.bot.inventory.items().filter(item => 
            requiredTools.some(tool => item.name.includes(tool.split('_')[1]))
        );

        return {
            type: 'tools',
            passed: availableTools.length > 0,
            message: availableTools.length > 0 ? 
                `Tools available: ${availableTools.map(t => t.name).join(', ')}` :
                'No tools available - may need to craft some',
            details: { requiredTools, availableTools }
        };
    }

    // Start monitoring for progress stagnation
    startProgressMonitoring() {
        this.progressInterval = setInterval(() => {
            if (!this.monitoringActive) return;

            const timeSinceProgress = Date.now() - this.monitoring.lastProgressTime;
            
            if (timeSinceProgress > this.thresholds.maxStagnantTime) {
                this.handleStagnation(timeSinceProgress);
            }

            // Check if bot is stuck in same position
            const currentPos = this.bot.entity.position;
            if (this.monitoring.lastPosition) {
                const distance = currentPos.distanceTo(this.monitoring.lastPosition);
                if (distance < 1 && timeSinceProgress > 10000) { // Same position for 10+ seconds
                    this.handlePositionStagnation(currentPos, timeSinceProgress);
                }
            }
            this.monitoring.lastPosition = currentPos.clone();

        }, 5000); // Check every 5 seconds
    }

    // Start monitoring environment threats
    startEnvironmentMonitoring() {
        this.environmentInterval = setInterval(() => {
            if (!this.monitoringActive) return;

            const now = Date.now();

            // Check for hostile mobs every 10 seconds
            if (now - this.monitoring.environmentChecks.lastMobCheck > 10000) {
                this.checkForHostileMobs();
                this.monitoring.environmentChecks.lastMobCheck = now;
            }

            // Check weather every 30 seconds
            if (now - this.monitoring.environmentChecks.lastWeatherCheck > 30000) {
                this.checkWeatherConditions();
                this.monitoring.environmentChecks.lastWeatherCheck = now;
            }

        }, 5000);
    }

    // Start monitoring resources
    startResourceMonitoring() {
        this.resourceInterval = setInterval(() => {
            if (!this.monitoringActive) return;

            this.checkResourceLevels();
            this.checkDistanceFromBuildSite();

        }, 10000); // Check every 10 seconds
    }

    // Start monitoring bot health
    startHealthMonitoring() {
        this.healthInterval = setInterval(() => {
            if (!this.monitoringActive) return;

            if (this.bot.health <= this.thresholds.healthThreshold) {
                this.handleLowHealth();
            }

            if (this.bot.food <= 5) {
                this.handleLowHunger();
            }

        }, 3000); // Check every 3 seconds
    }

    // Handle different types of failures and stagnation
    async handleStagnation(duration) {
        const warning = {
            type: 'progress_stagnation',
            timestamp: new Date().toISOString(),
            duration: duration,
            botPosition: this.bot.entity.position,
            phase: this.buildSession ? this.buildSession.phase : 'unknown'
        };

        this.warnings.push(warning);
        console.log(chalk.yellow(`⚠️ [GUARDIAN] Progress stagnation detected: ${duration}ms without progress`));
        this.agent.bot.chat(`⚠️ No progress for ${Math.round(duration/1000)}s - investigating...`);

        // Try automatic recovery
        await this.attemptRecovery('stagnation');
        this.logWarning(warning);
    }

    async handlePositionStagnation(position, duration) {
        const warning = {
            type: 'position_stagnation',
            timestamp: new Date().toISOString(),
            duration: duration,
            position: position,
            phase: this.buildSession ? this.buildSession.phase : 'unknown'
        };

        this.warnings.push(warning);
        console.log(chalk.yellow(`⚠️ [GUARDIAN] Bot stuck at position for ${duration}ms`));
        this.agent.bot.chat(`⚠️ I seem to be stuck - trying to move...`);

        // Try to unstick the bot
        await this.attemptRecovery('stuck');
        this.logWarning(warning);
    }

    async handleRepeatedFailure(failureType, context) {
        if (!this.monitoring.repeatedFailures[failureType]) {
            this.monitoring.repeatedFailures[failureType] = 0;
        }
        this.monitoring.repeatedFailures[failureType]++;

        if (this.monitoring.repeatedFailures[failureType] >= this.thresholds.maxRepeatedFailures) {
            const failure = {
                type: 'repeated_failure',
                failureType: failureType,
                count: this.monitoring.repeatedFailures[failureType],
                timestamp: new Date().toISOString(),
                context: context
            };

            this.failures.push(failure);
            console.log(chalk.red(`❌ [GUARDIAN] Repeated failure detected: ${failureType} (${failure.count} times)`));
            this.agent.bot.chat(`❌ Repeated ${failureType} failures - switching strategy`);

            await this.attemptRecovery('repeated_failure', { failureType, context });
            this.logFailure(failure);
        }
    }

    checkForHostileMobs() {
        const hostileMobs = this.findNearbyHostileMobs();
        if (hostileMobs.length > 0) {
            console.log(chalk.yellow(`⚠️ [GUARDIAN] ${hostileMobs.length} hostile mobs detected nearby`));
            this.agent.bot.chat(`⚠️ ${hostileMobs.length} hostile mobs nearby - being careful`);
            
            // You could add mob avoidance logic here
        }
    }

    checkWeatherConditions() {
        if (this.bot.isRaining) {
            console.log(chalk.yellow(`🌧️ [GUARDIAN] Rain detected - may affect visibility`));
        }
    }

    checkResourceLevels() {
        const inventory = this.bot.inventory.items();
        const buildingMaterials = inventory.filter(item => 
            this.isBuildingMaterial(item.name)
        );

        const totalMaterials = buildingMaterials.reduce((sum, item) => sum + item.count, 0);

        if (totalMaterials < this.thresholds.minResourcesThreshold) {
            console.log(chalk.yellow(`⚠️ [GUARDIAN] Low building materials: ${totalMaterials} items`));
            this.agent.bot.chat(`⚠️ Running low on building materials (${totalMaterials} items left)`);
        }
    }

    checkDistanceFromBuildSite() {
        if (!this.buildSession || !this.buildSession.blueprint) return;

        const buildCenter = this.calculateBuildCenter(this.buildSession.blueprint);
        const botPos = this.bot.entity.position;
        const distance = botPos.distanceTo(buildCenter);

        if (distance > this.thresholds.maxDistanceFromSite) {
            console.log(chalk.yellow(`⚠️ [GUARDIAN] Bot far from build site: ${distance.toFixed(1)} blocks away`));
            this.agent.bot.chat(`⚠️ I'm quite far from the build site - heading back`);
        }
    }

    handleLowHealth() {
        console.log(chalk.red(`❤️ [GUARDIAN] Low health detected: ${this.bot.health}/20`));
        this.agent.bot.chat(`❤️ Low health (${this.bot.health}/20) - need to be careful`);
        
        // Could implement healing logic here
    }

    handleLowHunger() {
        console.log(chalk.yellow(`🍖 [GUARDIAN] Low hunger: ${this.bot.food}/20`));
        this.agent.bot.chat(`🍖 Getting hungry (${this.bot.food}/20) - should eat soon`);
        
        // Could implement eating logic here
    }

    // Recovery strategies
    async attemptRecovery(problemType, context = {}) {
        console.log(chalk.blue(`🔧 [GUARDIAN] Attempting recovery for: ${problemType}`));

        switch(problemType) {
            case 'stagnation':
                await this.recoverFromStagnation();
                break;
            case 'stuck':
                await this.recoverFromStuck();
                break;
            case 'repeated_failure':
                await this.recoverFromRepeatedFailure(context);
                break;
            default:
                console.log(chalk.yellow(`⚠️ [GUARDIAN] No recovery strategy for: ${problemType}`));
        }
    }

    async recoverFromStagnation() {
        // Reset progress timer since we're taking action
        this.updateProgress();
        
        // Try to continue with current task
        if (this.buildSession) {
            console.log(chalk.blue(`🔧 [GUARDIAN] Resuming current build phase: ${this.buildSession.phase}`));
            await this.buildSession.executeCurrentPhase();
        }
    }

    async recoverFromStuck() {
        // Try random movements to unstick
        const directions = [
            { x: 1, z: 0 }, { x: -1, z: 0 }, 
            { x: 0, z: 1 }, { x: 0, z: -1 }
        ];
        
        for (let dir of directions) {
            try {
                const targetPos = this.bot.entity.position.offset(dir.x, 0, dir.z);
                await this.bot.pathfinder.goto(new Vec3(targetPos.x, targetPos.y, targetPos.z));
                console.log(chalk.green(`✅ [GUARDIAN] Successfully moved to unstick`));
                break;
            } catch (error) {
                // Try next direction
            }
        }
        
        this.updateProgress();
    }

    async recoverFromRepeatedFailure(context) {
        console.log(chalk.blue(`🔧 [GUARDIAN] Implementing strategy change for: ${context.failureType}`));
        
        // Reset the failure counter for this type
        this.monitoring.repeatedFailures[context.failureType] = 0;
        
        // Could implement specific recovery strategies based on failure type
        this.updateProgress();
    }

    // Update progress timestamp (call when progress is made)
    updateProgress() {
        this.monitoring.lastProgressTime = Date.now();
    }

    // Pattern learning and detection
    recordSuccess(action, context) {
        this.patterns.successes.push({
            action: action,
            context: context,
            timestamp: Date.now()
        });
        
        // Keep only recent patterns
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        this.patterns.successes = this.patterns.successes.filter(p => p.timestamp > cutoff);
    }

    recordFailure(action, context, reason) {
        this.patterns.failures.push({
            action: action,
            context: context,
            reason: reason,
            timestamp: Date.now()
        });
        
        // Keep only recent patterns
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        this.patterns.failures = this.patterns.failures.filter(p => p.timestamp > cutoff);
        
        // Check for repeated failure pattern
        this.handleRepeatedFailure(action, context);
    }

    // Helper methods
    analyzeRequiredMaterials(blueprint) {
        const materials = {};
        if (blueprint.blocks) {
            for (let block of blueprint.blocks) {
                materials[block.type] = (materials[block.type] || 0) + 1;
            }
        }
        return materials;
    }

    analyzeCurrentInventory() {
        const inventory = {};
        for (let item of this.bot.inventory.items()) {
            inventory[item.name] = (inventory[item.name] || 0) + item.count;
        }
        return inventory;
    }

    calculateBuildArea(blueprint) {
        if (!blueprint.blocks || blueprint.blocks.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
        }

        return {
            minX: Math.min(...blueprint.blocks.map(b => b.x)),
            maxX: Math.max(...blueprint.blocks.map(b => b.x)),
            minY: Math.min(...blueprint.blocks.map(b => b.y)),
            maxY: Math.max(...blueprint.blocks.map(b => b.y)),
            minZ: Math.min(...blueprint.blocks.map(b => b.z)),
            maxZ: Math.max(...blueprint.blocks.map(b => b.z))
        };
    }

    calculateBuildCenter(blueprint) {
        const area = this.calculateBuildArea(blueprint);
        return new Vec3(
            (area.minX + area.maxX) / 2,
            (area.minY + area.maxY) / 2,
            (area.minZ + area.maxZ) / 2
        );
    }

    findNearbyHostileMobs() {
        const hostileTypes = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman'];
        return Object.values(this.bot.entities).filter(entity => 
            entity.type === 'mob' && 
            hostileTypes.some(type => entity.name && entity.name.includes(type)) &&
            entity.position.distanceTo(this.bot.entity.position) < 20
        );
    }

    isNaturalTerrain(blockName) {
        const naturalBlocks = ['grass_block', 'dirt', 'stone', 'sand', 'gravel', 'air', 'water', 'lava'];
        return naturalBlocks.includes(blockName);
    }

    isBuildingMaterial(itemName) {
        const buildingMaterials = [
            'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
            'cobblestone', 'stone', 'bricks', 'glass', 'wool'
        ];
        return buildingMaterials.some(material => itemName.includes(material));
    }

    // Logging methods
    logValidation(type, validations) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'validation',
            validationType: type,
            validations: validations,
            botPosition: this.bot.entity.position
        };
        
        fs.appendFileSync('./logs/construction_guardian.log', JSON.stringify(logEntry) + '\n');
    }

    logWarning(warning) {
        fs.appendFileSync('./logs/construction_guardian.log', JSON.stringify(warning) + '\n');
    }

    logFailure(failure) {
        fs.appendFileSync('./logs/construction_guardian.log', JSON.stringify(failure) + '\n');
    }

    // Get monitoring statistics
    getMonitoringStats() {
        return {
            active: this.monitoringActive,
            warnings: this.warnings.length,
            failures: this.failures.length,
            repeatedFailures: Object.keys(this.monitoring.repeatedFailures).length,
            lastProgress: this.monitoring.lastProgressTime,
            patterns: {
                successCount: this.patterns.successes.length,
                failureCount: this.patterns.failures.length
            }
        };
    }
} 