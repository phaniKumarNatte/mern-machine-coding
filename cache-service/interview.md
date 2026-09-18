npm init -y
npm install -D typescript tsx @types/node

                Client
                  |
                  ↓
          Express.js API
                  |
                  ↓
             Cache Layer
             /        \
          HIT          MISS
           |             |
           ↓             ↓
      Return data     MongoDB
                         |
                         ↓
                  Store in Cache
                         |
                         ↓
                    Return data

npm install express redis mongoose
npm install -D @types/express
