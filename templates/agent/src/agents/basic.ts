import {initializeAgentExecutorWithOptions} from 'langchain/agents'
import {ChatOpenAI} from 'langchain/chat_models/openai'
import {env} from '~/env.mjs'
import createTaskTool from '~/tools/createTask'
import deleteTaskTool from '~/tools/deleteTask'
import listTasksTool from '~/tools/listTasks'
import updateTaskTool from '~/tools/updateTask'

export default async function basicAgent({input}) {
	const encoder = new TextEncoder()

	const stream = new TransformStream()

	const writer = stream.writable.getWriter()

	const gptModel = 'gpt-4'

	const model = new ChatOpenAI({
		callbacks: [
			{
				async handleLLMNewToken(token) {
					await writer.ready
					await writer.write(encoder.encode(`${token}`))
				},
				async handleLLMEnd(data) {
					await writer.ready
					await writer.write(`[${JSON.stringify(data)}]`)
				},
				async handleAgentEnd() {
					await writer.ready
					await writer.close()
				}
			}
		],
		modelName: gptModel,
		openAIApiKey: env.OPENAI_API_KEY,
		streaming: true,
		temperature: 0
	})

	const tools = [
		createTaskTool(),
		deleteTaskTool(),
		listTasksTool(),
		updateTaskTool()
	]

	console.log('initializing agent executor')
	const executor = await initializeAgentExecutorWithOptions(tools, model, {
		agentArgs: {
			prefix: `You are a generally intelligent AI.`
		},
		agentType: 'openai-functions',
		returnIntermediateSteps: env.NODE_ENV === 'development',
		verbose: env.NODE_ENV === 'development'
	})

	executor.call({input})

	return stream.readable
}