<script>
	import Graph from './Graph.svelte';

    export let show_channel_graphs = false
    export let s
    export let c
</script>


<li class="channel_item {show_channel_graphs?'show_graphs':''}">
    <div class="channel_name">
        <a href="https://discord.com/channels/{s.id}/{c.id}" target="_blank">
            {c.name}
        </a>
    </div>

    {#if c.type == 'text'}
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
    {:else if c.type == 'voice'}
        <div class="channel_stats">
            <div>
                Voice
            </div>
            <div>
            ...
            </div>
            <div>
                {c.voice_users_online_count} active in voice
            </div>
        </div>
    {:else}
        <div class="channel_stats">
            <div>
                {c.type}
            </div>
        </div>
    {/if}

    {#if show_channel_graphs}
    <div class="activity_graphs">
        <Graph type="mph_by_dow" data="{c.mph_by_dow}" />
        <Graph type="mph_by_hod" data="{c.mph_by_hod}" show_x_axis=true/>
    </div>
    {/if}

</li>


<style>
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

.channel_name {
	grid-area: name;
	font-weight: bold;
	font-size: 18px;
    height: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.channel_stats {
	grid-area: stats;
}


.activity_graphs {
	grid-area: activity_graphs;
	display: flex;
}

</style>
