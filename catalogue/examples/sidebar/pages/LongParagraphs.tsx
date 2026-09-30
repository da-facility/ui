import {Heading} from '@astryxdesign/core/Heading';
import './long-paragraphs.css';

const chapters = [
  ['Before the first departure', 'The station is quiet before the first train. A cleaner crosses the concourse, a bakery opens its shutters, and the departure board starts another day. Beyond the platform lights, a pair of rails disappears into the dark. Someone checks a watch even though there is still plenty of time. The journey begins with these small, ordinary things, long before the wheels begin to turn.'],
  ['A window seat', 'From a window seat, the city changes a little at a time. Apartment balconies give way to workshops, workshops to allotments, and allotments to fields. A road follows the railway for a while before turning away. Inside the carriage, a newspaper folds, a cup settles onto a table, and the reflection in the glass becomes faint enough to see the morning clearly.'],
  ['Signals in the rain', 'Rain makes the signal lights look larger than they are. Red hangs above a junction while another train passes across the route ahead. The driver waits. Water runs down the window in crooked lines, collecting at the bottom before the next sweep of the wiper. When the signal changes, the train starts gently, taking up its weight one carriage at a time.'],
  ['The little stations', 'Some stations have only two platforms, a shelter, and a name painted on a wall. The train stops for less than a minute. A passenger steps down with a shopping bag, another climbs aboard with a bicycle, and the doors close again. For everyone travelling through, the place is a brief interruption. For someone standing on the platform, it is the centre of the day.'],
  ['Crossing the river', 'The river appears between two rows of trees and suddenly the view opens. The sound beneath the carriage changes as the wheels reach the bridge. There are boats below, a footpath along the bank, and a distant bend that hides the next town. The crossing lasts only a few seconds, but it is often the part of the journey that people remember.'],
  ['Freight after midnight', 'At night, freight trains pass the sleeping platforms. Containers carry names from places much farther away than the next station. A line of wagons stretches beyond the lamps, each wheelset adding its own beat to the same long rhythm. By morning, the train will be somewhere else, leaving the tracks clear for commuters, schoolchildren, and the first passengers heading towards the coast.'],
  ['The dining car', 'In the dining car, the tables are small and the conversations travel slowly. A spoon rattles against a saucer when the train crosses a set of points. Lunch arrives while a hillside slides past the window. There is something pleasant about eating a simple meal while making progress towards another place, with no road to watch and no turn to remember.'],
  ['Through the mountains', 'The line climbs beside a stream, entering short tunnels and returning to daylight. Villages appear on the opposite slope. At a bend, passengers near the back can see the front of their own train. The journey is slower here, and the landscape makes the slower pace feel reasonable. Between the mountains, distance is measured in bridges, curves, and the next patch of open sky.'],
  ['A connection to make', 'Changing trains gives a journey a second beginning. There is a platform number to find, a staircase to climb, and a few minutes to decide whether there is time for coffee. The next train may look different and sound different, but a seat by the window restores the familiar feeling. The station clock stays behind as the new departure becomes the present journey.'],
  ['Work at the depot', 'Away from the passenger platforms, the depot has its own timetable. Carriages are inspected, washed, and prepared for another trip. Tools are returned to their places, faults are recorded, and fresh supplies are loaded. Much of the work is never noticed by the people who benefit from it. A train that leaves on time carries the result of many earlier, less visible tasks.'],
  ['The evening return', 'On the return journey, familiar landmarks arrive in reverse order. The bridge comes before the factory, the factory before the rows of gardens. Some passengers sleep through the stations they watched closely that morning. The carriage lights become brighter against the darkening windows, and the city begins to gather around the railway again, one street and one illuminated room at a time.'],
  ['The end of the line', 'At the terminus, the train empties slowly. People check the luggage racks, put on coats, and step onto the platform. The carriage that held so many separate journeys becomes quiet. Outside, there are buses, bicycles, taxis, and familiar faces waiting beyond the barriers. The railway has finished its part for now. Tomorrow, the departure board will begin the story again.'],
] as const;

const filler = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae tellus a neque malesuada tincidunt. Suspendisse potenti. Donec posuere, libero sit amet faucibus consequat, arcu lacus dignissim velit, eget malesuada nibh erat sed sapien. Praesent at lectus id erat tristique pellentesque. Mauris tincidunt orci quis orci porttitor, nec gravida quam facilisis. Sed vitae sem ut neque consequat placerat. Nulla facilisi. Vivamus vel augue nec est sollicitudin commodo.';
const notebook = 'There is no need to hurry through a page like this. Imagine the steady movement of a carriage, the pause at a platform, and the gradual return to speed. A long journey leaves room for small observations: the changing colour of the fields, a station garden, a forgotten siding, or a person waving from a footbridge. The route continues beyond the edge of the window, whether anyone is watching it or not.';

export function LongParagraphs() {
  return <article className="long-paragraphs" aria-label="Railway notebook">
    <header>
      <Heading level={2}>Long paragraphs</Heading>
      <p>A railway notebook. Twelve stops, a little placeholder Latin, and enough time to watch the world go by.</p>
    </header>
    {chapters.map(([title, paragraph], index) => <section key={title} aria-labelledby={`railway-chapter-${index}`}>
      <Heading level={3} id={`railway-chapter-${index}`}>{title}</Heading>
      <p>{paragraph}</p>
      <p>{filler}</p>
      <p>{notebook}</p>
      <footer>Station note {String(index + 1).padStart(2, '0')} of {chapters.length}</footer>
    </section>)}
    <footer className="long-paragraphs__end" data-testid="paragraphs-end">
      <Heading level={3}>Last stop</Heading>
      <p>End of the notebook. Take a moment before the journey back.</p>
    </footer>
  </article>;
}
