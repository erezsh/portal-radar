<script>
    export let type = ""
    export let data = {}
    export let title = ""
    export let height = 100
    export let show_x_axis = false

	import {uPlot} from '../public/uPlot/uPlot.iife.min.js'
    import { afterUpdate } from 'svelte';

	let data_elem

    let DAYS = [null, "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

	let created_graph = false

	afterUpdate(() => {
        if (data_elem && !created_graph) {
            let d = extract_data(data_elem)
            if (type == "mph_by_dow") {
                createGraph_MphByDow(d, data_elem)
            } else if (type == "mph_by_hod") {
                createGraph_MphByHod(d, data_elem)
			}
			created_graph = true
        }
    })

	function extract_data(elem) {
		let data = JSON.parse(elem.attributes['data-series'].nodeValue)
		let data2 = [[], []]
		for (let i of data) {
			data2[0].push(parseInt(i[0]))
			data2[1].push(i[1])
		}
		return data2
    }

	function createGraph_MphByDow(data, elem) {
		return createGraph(data, elem, {
				label: "Day of Week",
				value: (self, rawValue) => DAYS[rawValue]
			}, {
			title: title,
			width: 400,
			height: height,
		})
	}
	function createGraph_MphByHod(data, elem) {
		return createGraph(data, elem, {
				label: "Hour of Day",
				value: (self, rawValue) => rawValue
			}, {
			title: title,
			width: 400,
			height: height,
		})
	}

	function createGraph(data, elem, xaxis, ext_opts) {
		let opts = {
            ...ext_opts,
            axes: [
                { show: show_x_axis, },
                { show: true, }
            ],
			series: [
				xaxis,
				{
					show: true,
					spanGaps: true,
					label: "Messages per hour (Avg)",
					value: (self, rawValue) => parseFloat(rawValue).toFixed(2),
					width: 1,
					stroke: "#03a9f4",
					fill: "#b3e5fc",
				}
			],
			scales: { "x": { time: false } }
		};

		let uplot = new uPlot(opts, data, elem);
	}


</script>

<div>
	<slot>
        <div class="graph {type}" bind:this={data_elem} data-series="{JSON.stringify(Object.entries(data))}"></div>
	</slot>
</div>


<style>
.mph_by_dow {
	width: 400px;
	margin: auto;
}
.mph_by_hod {
	width: 400px;
	margin: auto;
}

</style>