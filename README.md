# investment portfolio

Learning project for creating an app to follow stock portfolio value development.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Introduction

This is a project where I combine my passion for banking with my learning goals.

Used tech:
- React Native Expo
- React Context API for state management
- Expo-sql for data
- Alpha Vantage API for getting stock market prices

## Features

- Insert buy and sell transactions to your portfolio
- Get most recent close values for your stock from alphavantage and follow how your portolio's value develops
- Buying and selling updates the average price for your owned stock
- Browse your transactions

## Installation

Prerequisite: Node

Dependencies can be installed by: npm install

## Usage
- run and test the app using Expo Go
- update your own alphavantage API key to constants
- the app will not automatically fetch close values, since API free version only allows 25 fetches per day - take this into consideration

## License
 
Feel free to upload this template and modify to your needs!
