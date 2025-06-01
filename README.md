# TAV - Task Agnostic Evaluation using Minecraft

TAV is an advanced AI agent evaluation framework that uses Minecraft as a testing environment for autonomous agents. The system supports multiple AI models and provides comprehensive task evaluation capabilities for measuring agent performance across various scenarios.

## 🎯 Features

- **Multi-Model Support**: Compatible with GPT, Claude, Gemini, Llama, Qwen, Grok, Mistral, DeepSeek, and more
- **Task Evaluation**: Comprehensive evaluation framework for construction, cooking, crafting, and custom tasks
- **Real-time Monitoring**: Web-based viewer for observing agent behavior in real-time
- **Memory Management**: Persistent agent memory and learning capabilities
- **Voice Communication**: Text-to-speech integration for agent communication
- **Vision Support**: Screenshot interpretation for visual understanding
- **Multi-Agent Coordination**: Support for multiple agents working together
- **Flexible Configuration**: Extensive customization options through profiles and settings

## 🏗️ Project Structure

```
TAV/
├── source/                     # Core source code
│   ├── minecraft_agent/        # Main agent implementation
│   ├── ai_models/             # AI model integrations
│   ├── utils/                 # Utility functions
│   ├── agent_process/         # Process management
│   └── web_server/            # Web interface server
├── evaluation_tasks/          # Task definitions and evaluation scripts
│   ├── construction_tasks/    # Building and construction challenges
│   ├── cooking_tasks/         # Recipe and cooking challenges
│   ├── crafting_tasks/        # Item crafting challenges
│   └── single_agent/          # Single agent evaluation tasks
├── model_profiles/            # AI model configuration profiles
├── bot_templates/             # Bot behavior templates
├── minecraft_agent_main.js   # Main entry point
├── agent_settings.js          # Configuration settings
└── minecraft_viewer.html     # Web viewer interface
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- Minecraft Java Edition server
- API keys for desired AI models

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

5. **Set up Minecraft server**
   - Ensure you have a Minecraft 1.19.2+ server running
   - Update host and port in `agent_settings.js`

### Running the Agent

```bash
npm start
```

Or directly:
```bash
node minecraft_agent_main.js
```

## ⚙️ Configuration

### Agent Settings

Edit `agent_settings.js` to customize:

- **Minecraft Connection**: Host, port, authentication method
- **AI Models**: Model profiles and configurations
- **Behavior**: Memory, chat, vision, and coding permissions
- **UI**: Web viewer and monitoring options

### Model Profiles

Create or modify profiles in `model_profiles/` to configure:
- API endpoints and keys
- Model-specific parameters
- Prompt templates and examples
- Task-specific behaviors

## 🧪 Evaluation Framework

### Running Evaluations

1. **Single Task Evaluation**
   ```bash
   python evaluation_tasks/task_runner.py --task <task_name>
   ```

2. **Batch Evaluation**
   ```bash
   python evaluation_tasks/task_evaluation_engine.py --config <config_file>
   ```

3. **Analysis and Results**
   ```bash
   python evaluation_tasks/results_analyzer.py --results <results_dir>
   ```

### Task Categories

- **Construction Tasks**: Building structures, following blueprints
- **Cooking Tasks**: Preparing recipes, resource management
- **Crafting Tasks**: Creating items, tool usage
- **Custom Tasks**: User-defined evaluation scenarios

### Analyzers

- `construction_task_analyzer.py` - Analyzes building and construction performance
- `cooking_task_analyzer.py` - Evaluates cooking and recipe completion
- `crafting_task_analyzer.py` - Measures crafting efficiency and accuracy
- `results_analyzer.py` - General purpose result analysis

## 🌐 Web Interface

Access the web viewer at `http://localhost:8080` to:
- Monitor agent behavior in real-time
- View agent perspectives and decision-making
- Analyze task performance metrics
- Control agent parameters dynamically

## 🤖 Supported AI Models

### Google Models
- Gemini Pro, Gemini Flash
- Configuration: `model_profiles/gemini.json`

### Other Providers
- Grok (X.AI), Groq, HuggingFace, Replicate
- Multiple hosting options supported

## 🔧 Advanced Features

### Multi-Agent Scenarios
- Configure multiple agents with different models
- Coordinate complex tasks requiring collaboration
- Evaluate team performance and communication

### Vision Integration
- Enable screenshot analysis for visual tasks
- Integrate computer vision models
- Visual reasoning and spatial understanding

### Code Execution
- Allow agents to write and execute code
- Sandboxed execution environment
- Custom tool integration

### Memory and Learning
- Persistent memory across sessions
- Experience-based learning
- Adaptive behavior improvement

## 📊 Evaluation Metrics

The framework measures:
- **Task Completion Rate**: Percentage of successfully completed tasks
- **Efficiency**: Time and resource usage optimization
- **Accuracy**: Precision in following instructions
- **Adaptability**: Performance across varied scenarios
- **Communication**: Quality of inter-agent coordination

## 🛠️ Development

### Adding New Tasks
1. Create task definition in appropriate category folder
2. Implement evaluation logic in corresponding analyzer
3. Add task to evaluation pipeline

### Model Integration
1. Create new model file in `source/ai_models/`
2. Implement standard API interface
3. Add configuration profile
4. Update model selection logic

### Custom Behaviors
1. Modify templates in `bot_templates/`
2. Update agent behavior modes
3. Configure through settings or profiles

