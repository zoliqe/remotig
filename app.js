/* eslint-disable prefer-destructuring */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { Transceiver } from 'https://zoliqe.github.io/hamium/src/tcvr.js'
import { get as resolveConnector } from 'https://zoliqe.github.io/hamium/src/connector.js'
import { TcvrController } from 'https://zoliqe.github.io/hamium/src/controller.js'
import { RemotigController } from './remotig.js'

export class RemotigApp {
	constructor() {
		// this.page = 'main';
		this.connectors = {}
		this.kredence = {}
		this._params = new URLSearchParams(window.location.search)

		// this.unackStateQueries = 0

		// setInterval(() => this._fetchStatus(), 5000)
		window.onbeforeunload = () => {
			if (this.remote) {
				this.remote.poweroff()
				this.remote.disconnect()
			}
		}

		window.log = (text, level) => {
			const prev = document.getElementById('status').innerHTML
			document.getElementById('status').innerHTML = `${new Date().toJSON()}: [${level || 'INFO'}] ${text}<br/>` + prev
		}
	}

	async initialize() {
		this.transceiver = new Transceiver()

		await this.#initConnector()
		window.tcvr = this.transceiver // for debugging purposes
		window.uiCtlr = this.tcvr // for debugging purposes
		window.remoteCtlr = this.remote // for debugging purposes

		document.getElementById('activateBtn').onclick = () => this.switchPowerOn()
	}

	async #initConnector() {
		const connectorParams = {
			tcvr: {}, kredence: this.kredence, options: {
				host: this._params.get('remotig-host'),
			}
		}
		this.#parseTcvrName({ value: this._params.get('tcvr'), connectorParams })

		const conns = this._params.get('connector') // TODO connector=remotig-serial,sercat
		// const cat = this._params.get('cat')
		const remote = this._params.get('remote')

		if (remote && remote.includes('@')) {
			[this.kredence.rig, this.kredence.qth] = remote.trim().toLowerCase().split('@', 2)
			this.remote = new TcvrController('remotig')
			this.remote.attachTo(this.transceiver)
			this.remoteController = new RemotigController(this.remote, this.kredence)
		} else {
			alert('Remote connection (remote=) not defined or invalid!')
		}

		// if (cat) {
		// 	await this.#resolveConnector(cat, connectorParams, 'cat')
		// }
		if (conns) {
			await this.#resolveConnector(conns, connectorParams, 'pwr')
		}

		if (!Object.values(this.connectors).length) {
			alert('No connector (connector=) defined!')
		}

		// await this._fetchStatus()
	}

	#parseTcvrName({ value, connectorParams }) {
		const p = connectorParams
		const v = value && value.trim().toLowerCase()
		if (v && v.includes('-'))
			[p.tcvr.manufacturer, p.tcvr.model] = v.split('-', 2)
	}

	async #resolveConnector(id, params, type) {
		try {
			const connector = await resolveConnector(id, params)
			this.connectors[type] = connector
			console.debug(`Resolved connector: id=${connector.id} params=${JSON.stringify(params)}`)
			connector.init && await connector.init({
				onready: async () => {
					console.info('Instant poweron activated')
					await this.switchPowerOn()
				}
			})
		} catch (e) {
			console.error(e)
			throw e
		}
	}

	// async _fetchStatus() {
	// 	if (!this.kredence.rig || !this.connectors[0] || this.powerState) return

	// 	this.unackStateQueries += 1
	// 	const status = await this.connectors[0].checkState(this.kredence)
	// 	if (status && status.id) {
	// 		console.debug('rtt:', status.rtt)
	// 		this.operator = status.op || 'ON'
	// 		this.unackStateQueries = 0
	// 	}
	// 	if (this.unackStateQueries > 2) this.operator = 'OFF'

	// 	this._displayFreq(null) // display op
	// }

	async switchPowerOn() {
		document.getElementById('activateBtn').hidden = true
		const connectors = Object.values(this.connectors)
		await this.remote.connect(connectors)
		log('ACTIVE')
	}

}
