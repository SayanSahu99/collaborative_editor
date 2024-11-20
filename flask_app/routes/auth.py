from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import login_user, logout_user, login_required
from flask_app import db, bcrypt
from flask_app.models import User

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Fetch user from the database
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('main.home'))  # Redirect to home on successful login
        return render_template('login.html', error='Invalid credentials')

    return render_template('login.html')  # Render login page for GET requests

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if the username already exists
        if User.query.filter_by(username=username).first():
            return render_template('login.html', error='Username already exists')

        # Create a new user
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('auth.login'))  # Redirect to login page after registration

    return render_template('login.html')  # Render register page for GET requests

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.home'))  # Redirect to home after logout
