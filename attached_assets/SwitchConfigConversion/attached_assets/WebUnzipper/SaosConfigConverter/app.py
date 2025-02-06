import logging
from flask import Flask, render_template, request, jsonify
from utils.converter import convert_config

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "saos_converter_secret_key"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        saos6_config = request.form.get('config', '')
        if not saos6_config.strip():
            return jsonify({'error': 'Please provide a configuration'}), 400
        
        # Convert the configuration
        converted_config = convert_config(saos6_config)
        return jsonify({'result': converted_config})
    except Exception as e:
        logging.error(f"Conversion error: {str(e)}")
        return jsonify({'error': str(e)}), 500
