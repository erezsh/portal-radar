<script>
	import { onMount } from 'svelte';
	import Graph from './Graph.svelte';
	import Server from './Server.svelte';

	let UPDATE_FREQ = 10000;	// 10 seconds

	let server_root = '/'
	// let server_root = 'http://127.0.0.1:8000/'

	let server_list = []
	let channels_dict = {}
	let channels_search = ''
	let channels_sort_by = "name";

	let show_channel_graphs = false;

	async function list_servers() {
		let r = await fetch(server_root+'servers')

		if (!r.ok) {
			console.log("HTTP-Error: " + r.status);
			return {}
		}

		let json = await r.json()
		return Object.values(json);
	}

	async function list_channels(server, graph_info=false) {
		let r = await fetch(server_root+'channels/' + server + '/' + (graph_info?'?graph_info=true':''))

		if (!r.ok) {
			console.log("HTTP-Error: " + r.status);
			return {}
		}

		return await r.json()
	}

	async function filter_channels(channels, filter) {
		let a = []
		for (let c of (await channels)) {
			if (filter === null || c.name.indexOf(filter) !== -1)
			{
				a.push(c)
			}
		}
		return a
	}

	async function sorted_channels(channels, sort_by) {
		let sort_func;
		switch(sort_by) {
			case 'name':
				sort_func = function(a, b){return a.name.localeCompare(b.name)}
				break
			case 'last_message':
				sort_func = function(a, b){return new Date(b.last_message.date)-new Date(a.last_message.date)}
				break
			case 'last_mph':
				sort_func = function(a, b){return b.messages_last_hour-a.messages_last_hour}
				break
			case 'last_mpw':
				sort_func = function(a, b){return b.messages_last_week-a.messages_last_week}
				break
			case 'active_voices':
				sort_func = function(a, b){return (b.type=='voice')-(a.type=='voice') || b.voice_users_online_count-a.voice_users_online_count}
				break
			case 'total_messages':
				sort_func = function(a, b){return b.total_messages-a.total_messages}
				break
			default:
				console.log("unkown sort value")
		}

		let c = Array(...await channels)
		c.sort(sort_func);
		return c
	}

	function toggled_channel_graphs() {
		if (show_channel_graphs) {
			update_all_channels()
		}
	}

	async function update_channels(server_id) {
		console.debug("updating channels..")
		let c_list = channels_dict[server_id]
		let updated_channels = await list_channels(server_id, show_channel_graphs)
		for (let c of c_list) {
			let new_c = updated_channels[c.id]
			c.last_message = new_c.last_message
			c.messages_last_hour = new_c.messages_last_hour
			c.mph_by_hod = new_c.mph_by_hod
			c.mph_by_dow = new_c.mph_by_dow
			c.voice_users_online_count = new_c.voice_users_online_count
		}
		server_list = server_list
	}

	async function update_all_channels() {
		for (let s of server_list) {
			await update_channels(s.id)
		}
	}

	function update_channels_loop() {
			if (!is_tab_visible()) { return }

		setTimeout(async () => {
			if (!is_tab_visible()) { return }
			await update_all_channels()
			update_channels_loop()
		}, UPDATE_FREQ);
	}

	function is_tab_visible() {
		return document.visibilityState === 'visible'
	}

	function handleVisibilityChange() {
		if (is_tab_visible()) {
			update_channels_loop()
		}
	}

	async function get_channels(server_id) {
		if (!(server_id in channels_dict)) {
			let channels = Object.values(await list_channels(server_id, show_channel_graphs))

			channels.sort(function(a, b){return a.name.localeCompare(b.name)})
			channels_dict[server_id] = channels

			console.log("Setting auto-update")
			update_channels_loop()
		}
		// return channels_dict[server_id].slice(0, 10)
		return channels_dict[server_id]
	}

	async function init() {
		document.addEventListener("visibilitychange", handleVisibilityChange)
		server_list = await list_servers()
	}
	onMount(init)

</script>
​

<main>
	<h1>Portal Radar</h1>

	<div class="toolbar">
		<label>
			Search:
			<input type="search" bind:value={channels_search} />
		</label>
		Sort by:
		<div class="sort_menu">
			<input type=radio bind:group={channels_sort_by} value={"name"} id="sort_name" />
			<label for="sort_name"> Name </label>

			<input type=radio bind:group={channels_sort_by} value={"last_message"} id="sort_lm" />
			<label for="sort_lm"> Last message </label>

			<input type=radio bind:group={channels_sort_by} value={"last_mph"} id="sort_mph" />
			<label for="sort_mph"> Messages in the last hour </label>

			<input type=radio bind:group={channels_sort_by} value={"last_mpw"} id="sort_mpw" />
			<label for="sort_mpw"> Last week </label>

			<input type=radio bind:group={channels_sort_by} value={"active_voices"} id="sort_active_voices" />
			<label for="sort_active_voices"> Active in Voice</label>

			<input type=radio bind:group={channels_sort_by} value={"total_messages"} id="sort_tm" />
			<label for="sort_tm"> Total messages </label>
		</div>

		<label id="toggle_channel_graphs">
			<input type=checkbox bind:checked={show_channel_graphs} on:change={toggled_channel_graphs}>
			Toggle Channel Graphs
		</label>

	</div>

	<ul class="server_list">
	{#each server_list as s, i}
		<Server {s} {channels_sort_by} {channels_search} {show_channel_graphs} channels={sorted_channels( filter_channels( get_channels(s.id), channels_search), channels_sort_by )} />
	{/each}
	</ul>
</main>

<style>

.toolbar {
	margin-top: 40px;
	margin-bottom: 10px;
}

.sort_menu input[type="radio"] {
  opacity: 0;
  position: fixed;
  width: 0;
}
.sort_menu label {
    display: inline-block;
    background-color: #ddd;
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 8px;
}
.sort_menu input[type="radio"]:checked + label {
    background-color:#bfb;
    border-color: #4c4;
}
.sort_menu input[type="radio"]:focus + label {
  background-color: #cfc;
}
.sort_menu label:hover {
  background-color: #dfd;
}
.toolbar > * {
	display: inline-block;
}




main {
	text-align: center;
	padding: 1em;
	max-width: 240px;
	margin: 0 auto;
}

h1 {
	color: #ff3e00;
	text-transform: uppercase;
	font-size: 4em;
	font-weight: 100;
}

@media (min-width: 640px) {
	main {
		max-width: none;
	}
}
</style>
<link rel="stylesheet" href="uPlot/uPlot.min.css">
