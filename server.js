const dotenv = require('dotenv')
dotenv.config()
const axios = require('axios')
const Telegraf = require('telegraf')
const config = { telegram: { webhookReply: false } }
const bot = new Telegraf(process.env.BOT_TOKEN, config)
const { Wit } = require('node-wit')
const witClient = new Wit({ accessToken: process.env.WIT_TOKEN })

bot.start(context => {
    context.reply(`hello ${context.from.first_name}`)
})
bot.command('sales', async (context) => {
    const amount = await fetchAmountReport('sales')
    context.replyWithMarkdown(`Your total sales:\n*${formatAmount(amount)}*`)
})
bot.command('assets', async (context) => {
    const amount = await fetchAmountReport('assets')
    context.replyWithMarkdown(`Your total assets:\n*${formatAmount(amount)}*`)
})
bot.command('cash', async (context) => {
    const amount = await fetchAmountReport('cash')
    context.replyWithMarkdown(`Total cash in hand:\n*${formatAmount(amount)}*`)
})
bot.command('profit', async (context) => {
    const amount = await fetchAmountReport('profit')
    context.replyWithMarkdown(`Profit:\n*${formatAmount(amount)}*`)
})
bot.on('text', context => transact(context))
bot.startPolling()

const witBodyKey = 'wit$message_body:message_body'
const witNumberKey = 'wit$number:number'

const transact = async (context) => {
    const message = context.message.text
    const senderId = context.message.from.id.toString()
    let product = ''
    let amount = ''
    witClient.message(message, {})
        .then(data => {
            if (data.entities) {
                if (data.entities[witBodyKey] && data.entities[witBodyKey].length > 0) {
                    product = data.entities[witBodyKey][0].value
                }
                if (data.entities[witNumberKey] && data.entities[witNumberKey].length > 0) {
                    amount = data.entities[witNumberKey][0].value
                }
                if (product && amount) {
                    axios.post(`${process.env.SERVER_URL}/transactions`, {
                        product,
                        amount
                    })
                        .then(response => {
                            console.log(response)
                        })
                        .catch(error => console.log(error))
                }
            }
        })
        .catch(console.error)
}

const fetchAmountReport = async (endpoint) => {
    try {
        const response = await axios.get(`${process.env.SERVER_URL}/reports/${endpoint}`)
        if (response.data) {
            return response.data.amount
        }
        throw new Error('Not found')
    } catch (err) {
        console.log(err)
    }
}

const formatAmount = (number) => {
    return parseFloat(number).toLocaleString('en-US', { minimumFractionDigits: 2 })
}