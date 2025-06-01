import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Vec3 from 'vec3';

export class BuildSession {
    constructor(agent, buildingType, blueprint) {
        this.agent = agent;
        this.bot = agent.bot;
        this.buildingType = buildingType;
        this.blueprint = blueprint;
        this.sessionId = this.generateSessionId();
        this.phase = 'planning';
        this.progress = {
            totalBlocks: blueprint.blocks ? blueprint.blocks.length : 0,
            placedBlocks: 0,
            failedBlocks: [],
            completedPhases: []
        };
        this.checkpoints = [];
        this.ensureSessionDirectory();
        this.startTime = Date.now();
        
        // Building phases
        this.phases = [
            'planning',
            'resource_gathering', 
            'site_preparation',
            'foundation',
            'walls',
            'roof',
            'details',
            'verification'
        ];
        
        console.log(chalk.blue(`🏗️ [BUILD SESSION] Starting ${buildingType} build session: ${this.sessionId}`));
    }

    generateSessionId() {
        return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    ensureSessionDirectory() {
        const sessionDir = './sessions';
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
    }

    // Save current state to disk
    async createCheckpoint(description = '') {
        const checkpoint = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            phase: this.phase,
            progress: { ...this.progress },
            botPosition: this.bot.entity.position,
            botInventory: this.bot.inventory.items().map(item => ({ 
                name: item.name, 
                count: item.count,
                type: item.type 
            })),
            description: description,
            buildingType: this.buildingType,
            blueprint: this.blueprint
        };
        
        this.checkpoints.push(checkpoint);
        
        const checkpointFile = path.join('./sessions', `${this.sessionId}_checkpoint_${this.checkpoints.length}.json`);
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
        
        console.log(chalk.green(`💾 [BUILD SESSION] Checkpoint ${this.checkpoints.length} saved: ${description || 'Auto-checkpoint'}`));
        this.agent.bot.chat(`💾 Progress saved - Checkpoint ${this.checkpoints.length}`);
        
        return checkpoint;
    }

    // Load state from checkpoint
    static async loadSession(sessionId, agent) {
        try {
            const sessionFiles = fs.readdirSync('./sessions').filter(f => f.startsWith(sessionId));
            if (sessionFiles.length === 0) {
                throw new Error(`No session files found for ${sessionId}`);
            }
            
            // Find the latest checkpoint
            const checkpointFiles = sessionFiles.filter(f => f.includes('checkpoint')).sort();
            const latestCheckpoint = checkpointFiles[checkpointFiles.length - 1];
            
            const checkpointData = JSON.parse(fs.readFileSync(path.join('./sessions', latestCheckpoint), 'utf8'));
            
            // Recreate the session
            const session = new BuildSession(agent, checkpointData.buildingType, checkpointData.blueprint);
            session.sessionId = checkpointData.sessionId;
            session.phase = checkpointData.phase;
            session.progress = checkpointData.progress;
            session.checkpoints = [checkpointData];
            
            console.log(chalk.cyan(`🔄 [BUILD SESSION] Loaded session ${sessionId} from checkpoint`));
            agent.bot.chat(`🔄 Resuming build session from ${checkpointData.phase} phase`);
            
            return session;
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD SESSION] Failed to load session: ${error.message}`));
            return null;
        }
    }

    // Advance to next building phase
    async advancePhase() {
        const currentIndex = this.phases.indexOf(this.phase);
        if (currentIndex < this.phases.length - 1) {
            this.progress.completedPhases.push(this.phase);
            this.phase = this.phases[currentIndex + 1];
            
            console.log(chalk.blue(`🚀 [BUILD SESSION] Advancing to phase: ${this.phase}`));
            this.agent.bot.chat(`🚀 Starting ${this.phase.replace('_', ' ')} phase`);
            
            await this.createCheckpoint(`Phase transition to ${this.phase}`);
            return this.phase;
        } else {
            console.log(chalk.green(`🎉 [BUILD SESSION] All phases complete!`));
            this.agent.bot.chat("🎉 Building complete! All phases finished.");
            return 'complete';
        }
    }

    // Execute the current phase
    async executeCurrentPhase() {
        console.log(chalk.blue(`⚡ [BUILD SESSION] Executing phase: ${this.phase}`));
        
        switch(this.phase) {
            case 'planning':
                return await this.executePlanning();
            case 'resource_gathering':
                return await this.executeResourceGathering();
            case 'site_preparation':
                return await this.executeSitePreparation();
            case 'foundation':
                return await this.executeFoundation();
            case 'walls':
                return await this.executeWalls();
            case 'roof':
                return await this.executeRoof();
            case 'details':
                return await this.executeDetails();
            case 'verification':
                return await this.executeVerification();
            default:
                console.log(chalk.yellow(`⚠️ [BUILD SESSION] Unknown phase: ${this.phase}`));
                return false;
        }
    }

    async executePlanning() {
        console.log(chalk.cyan(`📋 [PLANNING] Analyzing blueprint and planning construction...`));
        this.agent.bot.chat("📋 Planning the construction process...");
        
        // Analyze required materials
        const materials = this.analyzeRequiredMaterials();
        console.log(chalk.cyan(`📋 [PLANNING] Required materials: ${Object.keys(materials).join(', ')}`));
        
        // Check current inventory
        const inventory = this.analyzeCurrentInventory();
        console.log(chalk.cyan(`📋 [PLANNING] Current inventory analyzed`));
        
        // Plan construction order
        const constructionPlan = this.planConstructionOrder();
        console.log(chalk.cyan(`📋 [PLANNING] Construction plan created with ${constructionPlan.length} steps`));
        
        await this.createCheckpoint('Planning phase completed');
        return true;
    }

    async executeResourceGathering() {
        console.log(chalk.cyan(`⛏️ [RESOURCES] Gathering required materials...`));
        this.agent.bot.chat("⛏️ Gathering materials for construction...");
        
        const requiredMaterials = this.analyzeRequiredMaterials();
        const currentInventory = this.analyzeCurrentInventory();
        
        for (let [material, needed] of Object.entries(requiredMaterials)) {
            const have = currentInventory[material] || 0;
            if (have < needed) {
                console.log(chalk.yellow(`⛏️ [RESOURCES] Need ${needed - have} more ${material}`));
                // Here you would call gathering functions
                // await this.agent.gatherMaterial(material, needed - have);
            }
        }
        
        await this.createCheckpoint('Resource gathering completed');
        return true;
    }

    async executeSitePreparation() {
        console.log(chalk.cyan(`🏗️ [SITE PREP] Preparing construction site...`));
        this.agent.bot.chat("🏗️ Preparing the construction site...");
        
        // Clear the area if needed
        if (this.blueprint.clearArea) {
            console.log(chalk.cyan(`🏗️ [SITE PREP] Clearing construction area...`));
            await this.clearConstructionArea();
        }
        
        // Level the ground if needed
        if (this.blueprint.levelGround) {
            console.log(chalk.cyan(`🏗️ [SITE PREP] Leveling the ground...`));
            await this.levelGround();
        }
        
        await this.createCheckpoint('Site preparation completed');
        return true;
    }

    async executeFoundation() {
        console.log(chalk.cyan(`🏗️ [FOUNDATION] Building foundation...`));
        this.agent.bot.chat("🏗️ Laying the foundation...");
        
        const foundationBlocks = this.blueprint.blocks.filter(block => 
            this.isFoundationLayer(block)
        );
        
        for (let block of foundationBlocks) {
            await this.placeBlockWithVerification(block.type, block.x, block.y, block.z);
            this.progress.placedBlocks++;
            
            // Checkpoint every 20 blocks
            if (this.progress.placedBlocks % 20 === 0) {
                await this.createCheckpoint(`Foundation progress: ${this.progress.placedBlocks} blocks`);
            }
        }
        
        await this.createCheckpoint('Foundation phase completed');
        return true;
    }

    async executeWalls() {
        console.log(chalk.cyan(`🧱 [WALLS] Building walls...`));
        this.agent.bot.chat("🧱 Building the walls...");
        
        const wallBlocks = this.blueprint.blocks.filter(block => 
            this.isWallBlock(block)
        );
        
        // Build walls layer by layer
        const layers = this.groupBlocksByLayer(wallBlocks);
        
        for (let layer of layers) {
            console.log(chalk.cyan(`🧱 [WALLS] Building layer at Y=${layer.y} (${layer.blocks.length} blocks)`));
            
            for (let block of layer.blocks) {
                await this.placeBlockWithVerification(block.type, block.x, block.y, block.z);
                this.progress.placedBlocks++;
            }
            
            await this.createCheckpoint(`Wall layer Y=${layer.y} completed`);
        }
        
        await this.createCheckpoint('Walls phase completed');
        return true;
    }

    async executeRoof() {
        console.log(chalk.cyan(`🏠 [ROOF] Building roof...`));
        this.agent.bot.chat("🏠 Adding the roof...");
        
        const roofBlocks = this.blueprint.blocks.filter(block => 
            this.isRoofBlock(block)
        );
        
        for (let block of roofBlocks) {
            await this.placeBlockWithVerification(block.type, block.x, block.y, block.z);
            this.progress.placedBlocks++;
        }
        
        await this.createCheckpoint('Roof phase completed');
        return true;
    }

    async executeDetails() {
        console.log(chalk.cyan(`✨ [DETAILS] Adding finishing touches...`));
        this.agent.bot.chat("✨ Adding doors, windows, and details...");
        
        const detailBlocks = this.blueprint.blocks.filter(block => 
            this.isDetailBlock(block)
        );
        
        for (let block of detailBlocks) {
            await this.placeBlockWithVerification(block.type, block.x, block.y, block.z);
            this.progress.placedBlocks++;
        }
        
        await this.createCheckpoint('Details phase completed');
        return true;
    }

    async executeVerification() {
        console.log(chalk.cyan(`🔍 [VERIFY] Final verification...`));
        this.agent.bot.chat("🔍 Performing final verification...");
        
        if (this.agent.buildVerifier) {
            const validation = await this.agent.buildVerifier.validateStructure(this.blueprint);
            const functionality = await this.agent.buildVerifier.validateFunctionality(this.buildingType);
            
            console.log(chalk.green(`✅ [VERIFY] Structure accuracy: ${validation.accuracy}%`));
            console.log(chalk.green(`✅ [VERIFY] Functionality: ${functionality.functional ? 'PASSED' : 'FAILED'}`));
        }
        
        await this.createCheckpoint('Verification phase completed - Build finished');
        return true;
    }

    async placeBlockWithVerification(blockType, x, y, z) {
        try {
            // Use existing building functions
            if (this.agent.placeBlock) {
                await this.agent.placeBlock(blockType, x, y, z);
            }
            
            // Verify placement if verifier is available
            if (this.agent.buildVerifier) {
                const verification = await this.agent.buildVerifier.verifyBlockPlacement(blockType, x, y, z);
                if (!verification.success) {
                    this.progress.failedBlocks.push({ blockType, x, y, z, reason: verification.reason });
                }
            }
        } catch (error) {
            console.log(chalk.red(`❌ [BUILD SESSION] Failed to place ${blockType} at (${x},${y},${z}): ${error.message}`));
            this.progress.failedBlocks.push({ blockType, x, y, z, error: error.message });
        }
    }

    // Helper methods for classifying blocks
    isFoundationLayer(block) {
        // Simple check - lowest Y level blocks
        const minY = Math.min(...this.blueprint.blocks.map(b => b.y));
        return block.y === minY;
    }

    isWallBlock(block) {
        // Blocks that aren't foundation or roof
        return !this.isFoundationLayer(block) && !this.isRoofBlock(block) && !this.isDetailBlock(block);
    }

    isRoofBlock(block) {
        // Simple check - highest Y level blocks
        const maxY = Math.max(...this.blueprint.blocks.map(b => b.y));
        return block.y === maxY;
    }

    isDetailBlock(block) {
        const detailTypes = ['oak_door', 'glass', 'glass_pane', 'torch', 'ladder'];
        return detailTypes.includes(block.type);
    }

    groupBlocksByLayer(blocks) {
        const layers = {};
        for (let block of blocks) {
            if (!layers[block.y]) {
                layers[block.y] = { y: block.y, blocks: [] };
            }
            layers[block.y].blocks.push(block);
        }
        return Object.values(layers).sort((a, b) => a.y - b.y);
    }

    analyzeRequiredMaterials() {
        const materials = {};
        if (this.blueprint.blocks) {
            for (let block of this.blueprint.blocks) {
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

    planConstructionOrder() {
        // Return a simple construction plan
        return [
            'Clear area if needed',
            'Level ground if needed', 
            'Build foundation layer',
            'Build walls layer by layer',
            'Add roof',
            'Add details (doors, windows)',
            'Final verification'
        ];
    }

    async clearConstructionArea() {
        console.log(chalk.yellow(`🧹 [SITE PREP] Clearing construction area...`));
        // Implementation would go here
    }

    async levelGround() {
        console.log(chalk.yellow(`🏗️ [SITE PREP] Leveling ground...`));
        // Implementation would go here
    }

    getProgressReport() {
        const totalBlocks = this.progress.totalBlocks;
        const placedBlocks = this.progress.placedBlocks;
        const percentage = totalBlocks > 0 ? (placedBlocks / totalBlocks * 100).toFixed(1) : 0;
        
        return {
            sessionId: this.sessionId,
            buildingType: this.buildingType,
            phase: this.phase,
            progress: percentage,
            placedBlocks: placedBlocks,
            totalBlocks: totalBlocks,
            failedBlocks: this.progress.failedBlocks.length,
            completedPhases: this.progress.completedPhases,
            checkpoints: this.checkpoints.length,
            duration: Date.now() - this.startTime
        };
    }

    async handleInterruption(reason = 'Unknown') {
        console.log(chalk.yellow(`⚠️ [BUILD SESSION] Handling interruption: ${reason}`));
        this.agent.bot.chat(`⚠️ Build interrupted: ${reason} - Saving progress...`);
        
        await this.createCheckpoint(`Interruption: ${reason}`);
        
        return {
            canResume: true,
            sessionId: this.sessionId,
            phase: this.phase,
            progress: this.getProgressReport()
        };
    }
} 