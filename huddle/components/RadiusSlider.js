import Slider from '@react-native-community/slider';

//Constants
const [value, setValue] = useState(50);

<Slider
  style={{width: 200, height: 40}}
  minimumValue={0}
  maximumValue={1000}
  minimumTrackTintColor="#e5e5e5"
  maximumTrackTintColor="#ff9747"
  lowerLimit = {0}
  upperLimit = {1000}
/>
