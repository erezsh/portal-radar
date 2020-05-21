<script>
	import Graph from './Graph.svelte';
	import Channel from './Channel.svelte';

    export let show_channel_graphs = false
    export let s
    export let channels

    export let show_channels = true

</script>



<li class="server_item show_graphs">
    <div class="server_name">
		<label>
			<input type=checkbox bind:checked={show_channels}>
            {s.name}
		</label>

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
    {#if show_channels}
    <div class="server_channel_list">
        {#await channels}
            <p>...waiting for channels...</p>
        {:then channel_list}
            <ul>
            {#each channel_list as c, i}
                <Channel {s} {c} {show_channel_graphs} />
            {/each}
            </ul>
        {:catch error}
            Error loading channels
        {/await}
    </div>
    {/if}
</li>

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

.hidden {
    display: none;
}
</style>