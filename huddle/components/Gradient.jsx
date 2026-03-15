import { LinearGradient } from 'expo-linear-gradient';

const GradientComponent = ({ children }) => (
  <LinearGradient
    colors={['#eb5e3a', '#d03d18']}
    start={{x: 0.50, y: 0.00}}
    end={{x: 0.50, y: 1.00}}
    style={{ flex: 1 }}
  >
    {children}
  </LinearGradient>
);

export default GradientComponent;