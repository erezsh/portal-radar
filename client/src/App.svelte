<script>
	import { afterUpdate, onMount } from 'svelte';
	import Graph from './Graph.svelte';

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
	<ul class="server_list">
	{#each server_list as s, i}
		<li class="server_item show_graphs">
			<div class="server_name">
				{s.name}
			</div>
			<div class="server_stats">
				<div>
					{s.total_members} members
				</div>
				<div>
					{s.channel_count} channels
				</div>
				<div>
					{s.total_messages} messages
				</div>
			</div>
			<div class="server_growth">
				<b>Member Growth</b>
				<div>
					+{s.members_joined_last_24h} in the last day
				</div>
				<div>
					+{s.members_joined_per_day_avg.toFixed(2)} every day (avg)
				</div>
			</div>
			<div class="server_activity">
				<div>
					<b>Activity</b>
				</div>
				<time datetime="{s.last_message.date}">
				Last message: {s.last_message.date_text}
				</time>
				<div>
					{s.messages_last_hour} messages in the last hour
				</div>
			</div>
			<div class="activity_graphs">
				<Graph type="mph_by_dow" data="{s.mph_by_dow}" title="Messages by Day of Week"/>
				<Graph type="mph_by_hod" data="{s.mph_by_hod}" title="Messages by Hour of Day (UTC)" show_x_axis=true/>
			</div>
			<div class="server_channel_list">
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

							<input type=radio bind:group={channels_sort_by} value={"total_messages"} id="sort_tm" />
							<label for="sort_tm"> Total messages </label>
						</div>

						<label id="toggle_channel_graphs">
							<input type=checkbox bind:checked={show_channel_graphs} on:change={toggled_channel_graphs}>
							Toggle Channel Graphs
						</label>

					</div>

				{#await sorted_channels( filter_channels( get_channels(s.id), channels_search), channels_sort_by )}
					<p>...waiting for channels...</p>
				{:then channel_list}
					<ul>
					{#each channel_list as c, i}
						<li class="channel_item {show_channel_graphs?'show_graphs':''}">
							<div class="channel_name">
								<a href="https://discord.com/channels/{s.id}/{c.id}" target="_blank">
									{c.name}
								</a>
							</div>

							<div class="channel_stats">
								<div>
									{c.total_messages} messages
								</div>
								<div>
									{#if c.messages_last_week>0}
									{c.messages_last_hour} last hour
									|
									{/if}
									{c.messages_last_week} last week
								</div>
								<div>
									<time datetime="{c.last_message.date}">
									Last message: {c.last_message.date_text}
									</time>
								</div>
							</div>

							{#if show_channel_graphs}
							<div class="activity_graphs">
								<Graph type="mph_by_dow" data="{c.mph_by_dow}" />
								<Graph type="mph_by_hod" data="{c.mph_by_hod}" show_x_axis=true/>
							</div>
							{/if}

						</li>
					{/each}
					</ul>
				{:catch error}
					Error loading channels
				{/await}
			</div>
		</li>
	{/each}
	</ul>
</main>

<style>
.server_name {
	grid-area: server;
	font-weight: bold;
	font-size: 20px;
}
.server_stats {
	grid-area: stats;
}
.server_growth {
	grid-area: growth;
}
.server_activity {
	grid-area: activity;
}
.activity_graphs {
	grid-area: activity_graphs;
	display: flex;
}

.server_channel_list {
	grid-area: channels
}

.mph_by_dow {
	width: 400px;
	margin: auto;
}
.mph_by_hod {
	width: 400px;
	margin: auto;
}

.server_item {
	display: grid;
	grid-template-columns: 200px 200px auto;

	grid-template-areas:
		"server growth   activity_graphs"
		"stats  activity activity_graphs"
		"channels channels channels";

	padding: 10px;
	border-top: 3px solid silver;
}

.channel_name {
	grid-area: name;
	font-weight: bold;
	font-size: 18px;
}

.channel_stats {
	grid-area: stats;
}

.channel_item {
	float: left;
	margin-right: 10px;
	margin-bottom: 10px;

	display: grid;

	grid-template-columns: 300px;

	grid-template-areas:
		"name"
		"stats"
	;

	margin-top: 10px;
	padding: 10px;
	background: #eee;
	border-bottom: 1px solid silver;
	max-width: 1200px

}

.channel_item.show_graphs {
	float: none;
	margin-right: 0;
	margin-bottom: 0;

	grid-template-columns: 60px 300px 800px;

	grid-template-areas:
		"blank name   activity_graphs"
		"blank stats  activity_graphs"
	;
}



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
