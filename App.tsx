import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortfolioProvider } from './src/context/PortfolioContext';
import Start from './src/components/Start';
import AddTransaction from './src/components/AddTransaction';
import Details from './src/components/Details';

const Stack = createNativeStackNavigator();

const App : React.FC = () : React.ReactElement => {

  return (
  
  <SafeAreaProvider>
      <PortfolioProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Portfolio" component={Start} />
            <Stack.Screen name="New transaction" component={AddTransaction} />
            <Stack.Screen name="Stock Details" component={Details} />
          </Stack.Navigator>
        </NavigationContainer>
      </PortfolioProvider>
  </SafeAreaProvider>
 
  )
}

export default App;

