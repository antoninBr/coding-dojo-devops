from flask import Flask, render_template
import os

app = Flask(__name__)

version = os.environ.get('VERSION')

print(version)

app.config["VERSION"]=version

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0')
