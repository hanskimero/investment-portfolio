import { SafeAreaProvider } from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {IconButton} from 'react-native-paper';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { PortfolioProvider, PortfolioContext } from './src/context/PortfolioContext';
import Start from './src/components/Start';
import AddTransaction from './src/components/AddTransaction';
import { useContext } from "react";

const Stack = createNativeStackNavigator();

const App : React.FC = () : React.ReactElement => {

  //const { getValues } = useContext(PortfolioContext);

  return (
  
  <SafeAreaProvider>
      <PortfolioProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen 
              name="Portfolio" 
              component={Start}
              // options={({ navigation }) => ({
              //   headerRight: () => (
              //     <IconButton
              //       onPress={() => getValues()}
              //       icon="refresh"
              //     />
              //   ),
              // })
              // } 
              />
            <Stack.Screen name="New transaction" component={AddTransaction} />
          </Stack.Navigator>
        </NavigationContainer>
      </PortfolioProvider>
  </SafeAreaProvider>
 
  )
}

export default App;

