
import { CanvasJSChart } from 'canvasjs-react-charts'

const Graf = ({  dateList }) => {

    const options = {
        title: {
            text: "Israel Bank"
        },
        axisX: {
            interval: 1
        },
        data: [{
            type: "area",
            dataPoints: dateList
        }]
    }

    return (
        <div style={{ margin: "auto", width: "95%" }}>
            <CanvasJSChart options={options} />
        </div>
    );
}
export default Graf;