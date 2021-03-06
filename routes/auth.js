var passport = require('passport');
var LdapStrategy = require('passport-ldapauth').Strategy;
var User = require('../models/user');
var Corpus = require('../models/corpus');
var fs = require('fs');
var path = require('path');
var os = require('os');


module.exports = function(app){
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(new LdapStrategy({
    server: {
      url: 'ldaps://ldap.rit.edu',
      searchBase: 'ou=people,dc=rit,dc=edu',
      searchFilter: '(uid={{username}})'
    }
  },
  function(user, done){
    User.find({ dce: user.uid }).limit(1).exec(function(err, users){
      if(users.length === 0) {
        User.create({ dce: user.uid, name: user.cn }, function(err, user){
          var files = ['1928 News article', '2015 News article', 'My Bondage and My Freedom excerpt Long',
            'Romeo and Juliet excerpt Long', 'The Raven', 'Tom Sawyer excerpt Long',
            '310 DementiaBank1', '310 DementiaBank2', '310 DementiaBank3', '310 DementiaBank4',
            '470 Raleigh', '470 Lennox', '470 Austen', '470 Doyle',
            '310 Very-Formal (E)', '310 Semi-Formal (E)', '310 Semi-Informal (E)', '310 Very-Informal (E)',
            '310 Very-Formal (J)', '310 Semi-Formal (J)', '310 Semi-Informal (J)', '310 Very-Informal (J)',
            'UnknownWS_Long', 'UnknownWS_Short', 'WordVector_Example',
            'Dialogue_RJ1 Short', 'Dialogue_RJ2 Short', 'Dialogue_RJ Long',
            'Dialogue_SB1 Short', 'Dialogue_SB2 Short', 'Dialogue_SB Long',
            'Debate_Excerpt_First_ASR.json', 'Debate_Excerpt_Second_ASR.json', 'Debate_Excerpt_Third_ASR.json',
            'Debate_Excerpt_First_Manual.json', 'Debate_Excerpt_Second_Manual.json', 'Debate_Excerpt_Third_Manual.json'];
            files.forEach(function(file){
            var corpusPath = path.join('dirname', '../assets/corpora/', file);
            fs.readFile(corpusPath, function(err,data) {
              if(err) {
                console.log(err);
              }
              var corpus = {
                user_id: user._id,
                contents: data,
                title: file,
                fileSize: 0,
                fileName: file,
                fileType: 'plaintext'
              };
            Corpus.create(corpus, function(err, c) {
            });
            });
          });
          done(null, user);

        });
      }else {
        done(null, users[0]);
      }
    });
  }));

  app.post('/api/login', passport.authenticate('ldapauth'), function(req, res) {
    res.send({user: req.user});
  });

  app.get('/api/logged_in', function(req, res){
    if(req.user) {
      res.send({loggedIn: true, user: req.user });
    }else{
      res.send({loggedIn: false});
    }
  });

  app.post('/api/logout', function(req, res){
    req.logout();
    res.send({});
  });
}
