<script>
	import { afterUpdate, onMount } from 'svelte';
	import Graph from './Graph.svelte';

	let server_root = 'http://127.0.0.1:8000/'

	let server_list = []
	let channels_dict = {}

	async function list_servers() {
		let r = await fetch(server_root+'servers')

		if (!r.ok) {
			console.log("HTTP-Error: " + r.status);
			return {}
		}

		let json = await r.json()
		return Object.values(json);
	}

	async function list_channels(server, update=false) {
		let r = await fetch(server_root+'channels/' + server + '/' + (update?'?update=true':''))

		if (!r.ok) {
			console.log("HTTP-Error: " + r.status);
			return {}
		}

		return await r.json()
	}

	function sort_channels(server_id, cmp) {
		let channels = channels_dict[server_id]
		channels.sort(cmp);
		server_list = server_list
	}

	function sort_channels__name(server) {
		let sort_func = function(a, b){return a.name.localeCompare(b.name)}
		return sort_channels(server, sort_func)
	}
	function sort_channels__messages_last_hour(server) {
		let sort_func = function(a, b){return b.messages_last_hour-a.messages_last_hour}
		return sort_channels(server, sort_func)
	}
	function sort_channels__last_message(server) {
		let sort_func = function(a, b){return new Date(b.last_message.date)-new Date(a.last_message.date)}
		return sort_channels(server, sort_func)
	}
	function sort_channels__total_messages(server) {
		let sort_func = function(a, b){return b.total_messages-a.total_messages}
		return sort_channels(server, sort_func)
	}

	async function update_channels(server_id) {
		console.debug("Updating")
		let c_list = channels_dict[server_id]
		let updated_channels = await list_channels(server_id, true)
		for (let c of c_list) {
			c.last_message = updated_channels[c.id].last_message
			c.messages_last_hour = updated_channels[c.id].messages_last_hour
		}
		server_list = server_list
	}

	async function update_channels_loop(server_id) {
		setTimeout(async () => {
			await update_channels(server_id)
			update_channels_loop(server_id)
		}, 10000);
	}

	async function get_channels(server_id) {
		if (!(server_id in channels_dict)) {
			let channels = Object.values(await list_channels(server_id))

			channels.sort(function(a, b){return a.name.localeCompare(b.name)})
			channels_dict[server_id] = channels

			console.log("Setting auto-update")
			await update_channels_loop(server_id)
		}
		return channels_dict[server_id]
	}

	async function init() {
		server_list = await list_servers()
	}
	onMount(init)

</script>
​

<main>
	<h1>Portal Radar</h1>
	<ul class="server_list">
	{#each server_list as s, i}
		<li class="server_item">
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
			<div class="server_activity_graphs">
				<Graph type="mph_by_dow" data="{s.mph_by_dow}" title="Messages by Day of Week"/>
				<Graph type="mph_by_hod" data="{s.mph_by_hod}" title="Messages by Hour of Day (UTC)" show_x_axis=true/>
			</div>
			<div class="server_channel_list">
				{#await get_channels(s.id)}
					<p>...waiting for channels...</p>
				{:then channel_list}
					<div class="sort_menu">
						Sort by:
						<button on:click={() => sort_channels__name(s.id)}>
							Name
						</button>
						<button on:click={() => sort_channels__last_message(s.id)}>
							Last message
						</button>
						<button on:click={() => sort_channels__messages_last_hour(s.id)}>
							Messages in the last hour
						</button>
						<button on:click={() => sort_channels__total_messages(s.id)}>
							Total messages
						</button>
						<!-- <button on:click={() => update_channels(s.id)}>
							Update
						</button> -->
					</div>
					<ul>
					{#each channel_list as c, i}
						<li class="channel_item">
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
									{c.messages_last_hour} in the last hour
								</div>
								<div>
									<time datetime="{c.last_message.date}">
									Last message: {c.last_message.date_text}
									</time>
								</div>
							</div>

							<div class="server_activity_graphs">
								<Graph type="mph_by_dow" data="{c.mph_by_dow}" />
								<Graph type="mph_by_hod" data="{c.mph_by_hod}" show_x_axis=true/>
							</div>

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
.server_activity_graphs {
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
	grid-template-columns: 200px 200px 900px;

	grid-template-areas:
		"server growth   activity_graphs"
		"stats  activity activity_graphs"
		"channels channels channels";

	padding: 10px;
	border: 3px solid silver;
	border-radius: 10px;
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
	display: grid;
	grid-template-columns: 60px 300px 800px;

	grid-template-areas:
		"blank name   activity_graphs"
		"blank stats  activity_graphs"
	;

	margin-top: 10px;
	padding: 10px;
	background: #eee;
	border-bottom: 1px solid silver;
	/* border-radius: 10px; */
}

.sort_menu {
	margin-top: 40px;
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