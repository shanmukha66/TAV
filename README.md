# TAV - Task Agnostic Evaluation using Minecraft

make agents have a build off in minecraft

TAV is built on top off [Mindcraft](https://github.com/kolbytn/mindcraft). 
TAV builds upon the foundation of Mindcraft, it focuses on autonomous agent operation and evaluation:

- **Autonomous Self-Correction and Verification**: Our system uniquely self-evaluates and autonomously corrects agent actions at every step. This is achieved through custom-built verification and checkpointing mechanisms.
- **Reliability and Replicability**: We ensure high reliability and replicability through persistent state management and deterministic building phases. This allows agents to recover from interruptions and ensures that construction tasks can be consistently reproduced and verified.
- **Continuous Learning from Failures**: The framework is designed for agents to continuously learn from failures, using this information for future prevention and to adapt their strategies over time.
- **End-to-End Robustness**: This end-to-end approach to agent design and internal evaluation makes our agents highly robust and adaptive compared to traditional, more narrowly task-based agent evaluation methodologies.


### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TAV
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure your AI model profiles**
   - Copy example profiles from `model_profiles/`
   - Add your API keys to the appropriate profile files
   - Update `agent_settings.js` with your desired profiles


