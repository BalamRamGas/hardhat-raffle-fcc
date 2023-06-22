const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai") //waffle-matchers
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { resolveConfig } = require("prettier")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", async function () {
          let raffle, raffleEntranceFee, deployer, raffleState /*interval*/
          /*const chainId = network.config.chainId*/

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              raffleState = await raffle.getRaffleState().toString()
              /*interval = await raffle.getInterval()*/
          })
          describe("fulfillRandomWords", function () {
              it("Works with live chainlink Automation and Chainlink VRF, we get a random winner", async function () {
                  console.log("setting up test...")
                  const startingTimestamp = await raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  //set up the listener before enter the raffle just in case blockchain moves really fast!
                  console.log("setting up listener")
                  await new Promise(async function (resolve, reject) {
                      raffle.once("WinnerPicked", async function () {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLastTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimestamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      console.log("Entering the raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("OK. Time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      //This code won't complete until our listener has finished listening
                  })
              })
          })
      })

//1.-Get our subId for chainlink VRF
//2.-Deploy our contract using the subId
//3.-Register the contract with chainlink VRF and it's subId
//4.-Register the contract with chainlink automation
//5.-Run staging test
